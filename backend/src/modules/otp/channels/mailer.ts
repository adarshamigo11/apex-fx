// Email OTP delivery via SMTP (nodemailer). Free/low-cost primary channel.
// If SMTP_* env is unset, falls back to console (dev) so flows are testable.
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../../config/env';

let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER) return null; // not configured
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

const subjectFor: Record<string, string> = {
  REGISTER: 'Verify your ApexFX account',
  LOGIN: 'Your ApexFX login code',
  PASSWORD_RESET: 'Reset your ApexFX password',
};

export async function sendOtpEmail(to: string, code: string, purpose: string, ttlMin: number) {
  const subject = subjectFor[purpose] ?? 'Your ApexFX verification code';
  const html = `
    <div style="font-family:system-ui;background:#0a0e1a;color:#e6edf3;padding:24px;border-radius:12px;max-width:420px">
      <h2 style="margin:0 0 8px"><span style="color:#ffd166">Apex</span><span style="color:#39ff8b">FX</span></h2>
      <p style="color:#8a94a6;margin:0 0 16px">${subject}</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#ffd166;text-align:center;padding:16px;background:rgba(255,255,255,.05);border-radius:8px">${code}</div>
      <p style="color:#8a94a6;font-size:12px;margin-top:16px">This code expires in ${ttlMin} minutes. If you didn't request it, ignore this email. Never share this code.</p>
    </div>`;
  const t = getTransport();
  if (!t) {
    console.log(`[mailer:DEV] OTP for ${to} (${purpose}): ${code} (expires ${ttlMin}m)`);
    return { delivered: false, dev: true };
  }
  await t.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, html });
  return { delivered: true, dev: false };
}
