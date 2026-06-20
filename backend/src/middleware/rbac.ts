import { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from '../common/errors';

// Role gate
export const requireRole = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'));
    next();
  };

// Fine-grained permission gate (employee permissions)
export const requirePermission = (...perms: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'SUPER_ADMIN') return next();
    const ok = perms.every((p) => req.user!.perms.includes(p));
    if (!ok) return next(forbidden('Missing permission'));
    next();
  };
