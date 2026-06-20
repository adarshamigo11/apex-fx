import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import marketRoutes from './modules/marketdata/marketdata.routes';
import tradingRoutes from './modules/trading/trading.routes';
import otpRoutes from './modules/otp/otp.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import adminRoutes from './modules/admin/admin.routes';
// TODO: Calendar module not implemented yet
// import calendarRoutes from './modules/calendar/calendar.routes';
import supportRoutes from './modules/support/support.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      const allowed = env.CORS_ORIGIN.split(',').map(s => s.trim());
      if (allowed.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/auth/otp', otpRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/trading', tradingRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/kyc', kycRoutes);
  app.use('/api/accounts', accountsRoutes);
  app.use('/api/admin', adminRoutes);
  // app.use('/api/calendar', calendarRoutes);
  app.use('/api/support', supportRoutes);

  app.use(errorHandler);
  return app;
}
