// SMS/WhatsApp OTP — OPTIONAL, pluggable for future use (e.g. Twilio, Gupshup).
// Not active by default. Implement send() and set OTP_SMS_ENABLED=true to use.
import { env } from '../../../config/env';

export interface SmsProvider { send(to: string, message: string): Promise<void>; }

// Example skeleton (left unimplemented on purpose):
class TwilioProvider implements SmsProvider {
  async send(_to: string, _message: string): Promise<void> {
    // const client = twilio(env.TWILIO_SID, env.TWILIO_TOKEN);
    // await client.messages.create({ from: env.TWILIO_FROM, to, body: message });
    throw new Error('SMS provider not configured');
  }
}

export function getSmsProvider(): SmsProvider | null {
  if (!env.OTP_SMS_ENABLED) return null;
  return new TwilioProvider();
}

export async function sendOtpSms(to: string, code: string, purpose: string): Promise<{ delivered: boolean }> {
  const p = getSmsProvider();
  if (!p) { console.log(`[sms:DISABLED] would send OTP ${code} to ${to} (${purpose})`); return { delivered: false }; }
  await p.send(to, `ApexFX ${purpose} code: ${code}. Expires soon. Do not share.`);
  return { delivered: true };
}
