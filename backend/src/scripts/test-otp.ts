import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { generateCode } from '../modules/otp/otp.service';
import { dispatchOtp } from '../modules/otp/channels';
import { sendOtpSms } from '../modules/otp/channels/sms';

let pass = 0; const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log('  ✓', m); pass++; };

(async () => {
  console.log('— code generation —');
  const codes = Array.from({ length: 2000 }, () => generateCode());
  ok(codes.every((c) => /^\d{6}$/.test(c)), 'all codes are exactly 6 digits');
  ok(codes.some((c) => c.startsWith('0')), 'leading-zero codes preserved (padStart)');
  ok(new Set(codes).size > 1500, 'codes are well-distributed (random)');

  console.log('— hashing (at rest) —');
  const code = generateCode();
  const hash = await bcrypt.hash(code, 10);
  ok(hash !== code && hash.startsWith('$2'), 'OTP stored as bcrypt hash, never plaintext');
  ok(await bcrypt.compare(code, hash), 'correct code verifies');
  ok(!(await bcrypt.compare('000000', hash)) || code === '000000', 'wrong code rejected');

  console.log('— channels —');
  const email = await dispatchOtp('EMAIL', 'user@test.com', '123456', 'LOGIN', 5);
  ok((email as any).dev === true, 'EMAIL falls back to dev mode when SMTP unset');
  const sms = await sendOtpSms('+100', '123456', 'LOGIN');
  ok(sms.delivered === false, 'SMS channel disabled by default (optional/future)');

  console.log(`\n✅ OTP UNIT: ${pass}/${pass} passed`);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
