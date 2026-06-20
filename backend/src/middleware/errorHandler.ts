import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors';
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code });
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
}
