import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { badRequest } from './errors';
export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) return next(badRequest(r.error.issues.map((i) => i.message).join(', ')));
    req.body = r.data;
    next();
  };
