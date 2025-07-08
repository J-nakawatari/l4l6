import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

export class AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode?: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // エラーログに記録
  log.error('Request error', {
    requestId: (req as any).id,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    errorCode: err.code,
    errorMessage: err.message,
    stack: err.stack,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // クライアントに返すエラーレスポンス
  const statusCode = err.statusCode || 500;
  const response = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { details: err.details }),
      requestId: (req as any).id,
    },
  };

  res.status(statusCode).json(response);
};

// 404ハンドラー
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
};