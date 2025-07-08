import { Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { AuthenticatedRequest } from '../types/auth.types';

export const adminAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  // 認証済みユーザーが管理者であることを確認
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403, 'FORBIDDEN');
  }

  next();
};