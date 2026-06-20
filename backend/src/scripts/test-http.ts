import { createApp } from '../app';
import assert from 'node:assert';

const app = createApp();
const server = app.listen(4555);
const B = 'http://127.0.0.1:4555';
let pass = 0; const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log('  ✓', m); pass++; };

(async () => {
  await new Promise((r) => setTimeout(r, 300));

  let res = await fetch(`${B}/health`); let j = await res.json();
  ok(res.status === 200 && j.ok === true, 'GET /health -> 200 {ok:true}');

  res = await fetch(`${B}/api/market/symbols`); j = await res.json();
  ok(res.status === 200 && Array.isArray(j.symbols) && j.symbols.length === 7, 'GET /market/symbols -> 7 symbols');
  ok(j.live === false, 'live flag = false (no API key -> mock)');

  res = await fetch(`${B}/api/market/candles/BTCUSD/M5`); j = await res.json();
  ok(res.status === 200 && Array.isArray(j) && j.length === 300, 'GET /candles/BTCUSD/M5 -> 300 mock candles');
  ok(j[0].open && j[0].high >= j[0].low && j[0].close, 'candle shape valid (o/h/l/c, high>=low)');

  res = await fetch(`${B}/api/market/candles/EURUSD/H1?limit=50`); j = await res.json();
  ok(Array.isArray(j) && j.length === 50, 'candle limit query honored (50)');

  // validation: bad register body -> 400 before any DB hit
  res = await fetch(`${B}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nope', password: '123' }) });
  j = await res.json();
  ok(res.status === 400 && /email|Password/i.test(j.error), 'register invalid body -> 400 validation error');

  // auth guard: protected route without token -> 401
  res = await fetch(`${B}/api/auth/me`);
  ok(res.status === 401, 'GET /auth/me without token -> 401');

  res = await fetch(`${B}/api/trading/accounts/x/snapshot`);
  ok(res.status === 401, 'protected trading route without token -> 401');

  // accounts module: auth-guarded + validated
  res = await fetch(`${B}/api/accounts`);
  ok(res.status === 401, 'GET /accounts without token -> 401');
  res = await fetch(`${B}/api/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  ok(res.status === 401, 'POST /accounts without token -> 401');

  // 404 path
  res = await fetch(`${B}/api/does-not-exist`);
  ok(res.status === 404, 'unknown route -> 404');

  // login with valid shape but no DB connected -> 500 handled cleanly (not a crash)
  res = await fetch(`${B}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', password: 'whatever12' }) });
  ok(res.status === 500, 'login w/o DB -> 500 handled by errorHandler (no crash)');


  // OTP endpoint validation (runs before DB)
  res = await fetch(`${B}/api/auth/otp/register/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'not-an-email' }) });
  ok(res.status === 400, 'OTP register/request bad email -> 400');
  res = await fetch(`${B}/api/auth/otp/login/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', code: '12' }) });
  ok(res.status === 400, 'OTP login/verify bad code format -> 400');
  res = await fetch(`${B}/api/auth/otp/password/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', code: '123456', newPassword: 'short' }) });
  ok(res.status === 400, 'OTP password/reset weak password -> 400');

  console.log(`\n✅ HTTP LAYER: ${pass}/${pass} checks passed`);
  server.close();
})().catch((e) => { console.error('❌', e.message); server.close(); process.exit(1); });
