import { sendOtpEmail } from './mailer';
import { sendOtpSms } from './sms';

export type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export async function dispatchOtp(channel: Channel, to: string, code: string, purpose: string, ttlMin: number) {
  switch (channel) {
    case 'EMAIL': return sendOtpEmail(to, code, purpose, ttlMin);
    case 'SMS':
    case 'WHATSAPP': return sendOtpSms(to, code, purpose); // optional/future
    default: throw new Error(`Unsupported channel ${channel}`);
  }
}
