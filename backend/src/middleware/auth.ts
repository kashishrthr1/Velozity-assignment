import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Invalid or expired token');
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}
