import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from '../common/errors';

export interface AuthPayload { sub: string; role: string; perms: string[]; }
declare global { namespace Express { interface Request { user?: AuthPayload } } }

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return next(unauthorized('Missing token'));
  try {
    req.user = jwt.verify(h.slice(7), env.JWT_ACCESS_SECRET) as AuthPayload;
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}
