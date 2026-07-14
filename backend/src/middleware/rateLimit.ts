import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true });
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 100, message: { error: 'Too many attempts' } });

// OTP endpoints: stricter to deter abuse / SMS-bombing / enumeration.
export const otpRequestLimiter = rateLimit({ windowMs: 10 * 60_000, max: 5, message: { error: 'Too many code requests. Try again later.' }, standardHeaders: true });
export const otpVerifyLimiter = rateLimit({ windowMs: 10 * 60_000, max: 15, message: { error: 'Too many attempts. Try again later.' }, standardHeaders: true });
