import 'dotenv/config';
function req(k: string, d?: string): string {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`Missing env var ${k}`);
  return v;
}
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  MONGODB_URI: req('MONGODB_URI', 'mongodb://localhost:27017'),
  MONGODB_DB: process.env.MONGODB_DB ?? 'apexfx',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_ACCESS_SECRET: req('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  JWT_REFRESH_SECRET: req('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  ACCESS_TTL: process.env.ACCESS_TTL ?? '15m',
  REFRESH_TTL_DAYS: parseInt(process.env.REFRESH_TTL_DAYS ?? '7', 10),
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY ?? '',
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY ?? '',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? '',
  S3_BUCKET: process.env.S3_BUCKET ?? 'kyc-uploads',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  MARGIN_CALL_LEVEL: parseFloat(process.env.MARGIN_CALL_LEVEL ?? '100'),
  STOP_OUT_LEVEL: parseFloat(process.env.STOP_OUT_LEVEL ?? '50'),
  // ---- OTP ----
  OTP_TTL_SEC: parseInt(process.env.OTP_TTL_SEC ?? '300', 10),            // 5 min
  OTP_RESEND_COOLDOWN_SEC: parseInt(process.env.OTP_RESEND_COOLDOWN_SEC ?? '60', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '3', 10),    // max 3 tries
  OTP_MAX_SENDS: parseInt(process.env.OTP_MAX_SENDS ?? '5', 10),
  OTP_SMS_ENABLED: (process.env.OTP_SMS_ENABLED ?? 'false') === 'true',
  // ---- SMTP (email OTP) ----
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? '',
};
