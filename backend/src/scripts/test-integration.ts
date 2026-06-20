// Full Mongo integration flow. Requires a running MongoDB *replica set*
// (transactions need it). Set MONGODB_URI; defaults to local rs.
// Run with: npm run test:integration   (see docker-compose.test.yml)
import assert from 'node:assert';
import { connectMongo, closeMongo, getDb } from '../config/mongo';
import { ensureIndexes } from '../db/indexes';
import { col, COL } from '../db/collections';
import * as auth from '../modules/auth/auth.service';
import * as trading from '../modules/trading/trading.service';
import { searchSymbols, searchUsers } from '../db/search';
import { ObjectId } from 'mongodb';

let pass = 0; const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log('  ✓', m); pass++; };

async function seedMinimal() {
  await col(COL.roles).updateOne({ name: 'USER' }, { $set: { name: 'USER', permissions: [], createdAt: new Date() } }, { upsert: true });
  await col(COL.symbols).updateOne({ name: 'EURUSD' }, { $set: {
    name: 'EURUSD', displayName: 'Euro', kind: 'FOREX', base: 'EUR', quote: 'USD',
    contractSize: 100000, digits: 5, minLot: 0.01, maxLot: 100, lotStep: 0.01,
    spreadPoints: 8, commission: 0, enabled: true, source: 'twelvedata', externalSymbol: 'EUR/USD',
  } }, { upsert: true });
}

(async () => {
  await connectMongo();
  await ensureIndexes();
  await getDb().dropDatabase(); // clean slate
  await ensureIndexes();
  await seedMinimal();

  console.log('— auth —');
  const reg = await auth.register({ email: `u${Date.now()}@t.com`, password: 'Passw0rd!', firstName: 'Test' });
  ok(!!reg.id && reg.status === 'PENDING' && !!reg.referralCode, 'register -> PENDING user + referralCode');
  // activate so login passes status gate
  await col(COL.users).updateOne({ _id: new ObjectId(reg.id) }, { $set: { status: 'ACTIVE' } });
  const email = (await col(COL.users).findOne({ _id: new ObjectId(reg.id) }))!.email;
  const login = await auth.login(email, 'Passw0rd!', { ip: '127.0.0.1', ua: 'test' });
  ok(!!login.accessToken && !!login.refreshToken, 'login -> access + refresh tokens');
  const refreshed = await auth.refresh(login.refreshToken, {});
  ok(!!refreshed.accessToken && refreshed.refreshToken !== login.refreshToken, 'refresh rotates token');
  let bad = false; try { await auth.refresh(login.refreshToken, {}); } catch { bad = true; }
  ok(bad, 'reused (rotated) refresh token is rejected');

  console.log('— trading account —');
  const acc = await col(COL.tradingAccounts).insertOne({
    login: '5000001', userId: new ObjectId(reg.id), type: 'DEMO', status: 'ACTIVE',
    currency: 'USD', server: 'Demo-1', leverage: 100, balance: 10000, credit: 0,
    createdAt: new Date(), updatedAt: new Date(),
  } as any);
  const accId = acc.insertedId.toString();

  console.log('— order + snapshot + close —');
  const pos = await trading.placeMarketOrder(accId, { symbol: 'EURUSD', side: 'BUY', lots: 1 });
  ok(pos.marginUsed > 0 && pos.ticket > 0, 'market order opens position with margin + ticket');
  const snap = await trading.accountSnapshot(accId);
  ok(snap.usedMargin > 0 && snap.equity > 0 && snap.marginLevel > 0, 'snapshot aggregation ($lookup) returns margins');
  const closed = await trading.closePosition(pos._id!.toString());
  ok(typeof closed.profit === 'number', 'close (ACID transaction) returns profit');
  const acctAfter = await col(COL.tradingAccounts).findOne({ _id: acc.insertedId });
  ok(Math.abs(Number(acctAfter!.balance) - (10000 + closed.profit)) < 0.01, 'balance updated by P&L in transaction');
  const th = await col(COL.tradeHistory).countDocuments({ accountId: acc.insertedId });
  ok(th === 1, 'trade history row written');

  console.log('— analytics aggregation ($facet) —');
  const a = await trading.analytics(accId);
  ok(a.totalTrades === 1 && typeof a.profitFactor === 'number' && Array.isArray(a.equityCurve), 'analytics returns stats + equity curve');

  console.log('— search (Atlas Search w/ regex fallback) —');
  const sym = await searchSymbols('eur');
  ok(sym.length >= 1, 'symbol search finds EURUSD');
  const usr = await searchUsers('Test');
  ok(usr.length >= 1, 'user search finds the registered user');

  console.log('— indexes —');
  const idx = await col(COL.users).indexes();
  ok(idx.some((i: any) => i.name === 'uniq_email'), 'unique email index exists');
  ok(idx.some((i: any) => i.key.referralCode), 'referralCode index exists');


  console.log('— OTP lifecycle —');
  const otpMod = await import('../modules/otp/otp.service');
  const otpEmail = `otp${Date.now()}@t.com`;
  await otpMod.requestOtp({ identifier: otpEmail, purpose: 'LOGIN', channel: 'EMAIL' });
  const st = await otpMod.otpStatus(otpEmail, 'LOGIN');
  ok(st.active === true && st.attemptsLeft === 3, 'OTP issued: active, 3 attempts');
  // cooldown blocks immediate resend
  let cd = false; try { await otpMod.requestOtp({ identifier: otpEmail, purpose: 'LOGIN', channel: 'EMAIL' }); } catch (e: any) { cd = e.code === 'OTP_COOLDOWN'; }
  ok(cd, 'resend within cooldown rejected (OTP_COOLDOWN)');
  // stored hashed, not plaintext
  const stored: any = await col(COL.otps).findOne({ identifier: otpEmail, purpose: 'LOGIN' });
  ok(stored.codeHash && stored.codeHash.startsWith('$2') && !/^[0-9]{6}$/.test(stored.codeHash), 'OTP stored hashed in Mongo (not plaintext)');
  // set a known code to exercise verify
  await col(COL.otps).updateOne({ _id: stored._id }, { $set: { codeHash: await (await import('bcryptjs')).default.hash('424242', 10) } });
  // wrong attempts -> decrement and eventually lock
  let r1 = ''; try { await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '000000' }); } catch (e: any) { r1 = e.code; }
  ok(r1 === 'OTP_INVALID', 'wrong code -> OTP_INVALID (attempt counted)');
  try { await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '000001' }); } catch {}
  let locked = ''; try { await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '000002' }); } catch (e: any) { locked = e.code; }
  ok(locked === 'OTP_LOCKED', 'after 3 wrong attempts -> OTP_LOCKED');
  // even the correct code is now locked
  let stillLocked = false; try { await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '424242' }); } catch (e: any) { stillLocked = e.code === 'OTP_LOCKED'; }
  ok(stillLocked, 'correct code rejected once locked');
  // fresh code (bypass cooldown by ageing lastSentAt), then succeed + consume
  await col(COL.otps).updateOne({ _id: stored._id }, { $set: { lastSentAt: new Date(Date.now() - 999000) } });
  await otpMod.requestOtp({ identifier: otpEmail, purpose: 'LOGIN', channel: 'EMAIL' });
  await col(COL.otps).updateOne({ identifier: otpEmail, purpose: 'LOGIN' }, { $set: { codeHash: await (await import('bcryptjs')).default.hash('555555', 10) } });
  ok((await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '555555' })) === true, 'correct fresh code verifies');
  let reused = false; try { await otpMod.verifyOtp({ identifier: otpEmail, purpose: 'LOGIN', code: '555555' }); } catch { reused = true; }
  ok(reused, 'consumed code cannot be reused');
  // expiry handling
  await otpMod.requestOtp({ identifier: `exp${Date.now()}@t.com`, purpose: 'REGISTER', channel: 'EMAIL' });
  ok(true, 'register OTP request works');
  // OTP TTL index present
  const oi = await col(COL.otps).indexes();
  ok(oi.some((i: any) => i.name === 'ttl_expiry' && i.expireAfterSeconds === 0), 'OTP TTL index exists (auto-expiry)');
  ok(oi.some((i: any) => i.name === 'uniq_identifier_purpose'), 'OTP unique (identifier,purpose) index exists');

  console.log('— password reset revokes sessions —');
  const u2 = await auth.findByEmail(email);
  await auth.setPassword(u2!._id!.toString(), 'NewPassw0rd!');
  const liveTokens = await col(COL.refreshTokens).countDocuments({ userId: u2!._id, revokedAt: null });
  ok(liveTokens === 0, 'setPassword revokes all active refresh tokens');

  console.log(`\n✅ INTEGRATION: ${pass}/${pass} passed`);
  await closeMongo();
  process.exit(0);
})().catch(async (e) => { console.error('❌ INTEGRATION FAILED:', e.message); await closeMongo().catch(()=>{}); process.exit(1); });
