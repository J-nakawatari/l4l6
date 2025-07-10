import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { httpLogStream, log } from '../utils/logger';

// カスタムトークン
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

morgan.token('request-id', (req: Request) => {
  return (req as any).id || '-';
});

// HTTPログフォーマット
const logFormat = ':request-id :remote-addr :user-id :method :url :status :response-time ms - :res[content-length]';

// HTTPリクエストログミドルウェア
export const httpLogging = morgan(logFormat, {
  stream: httpLogStream,
  skip: (req: Request, _res: Response) => {
    // ヘルスチェックエンドポイントはスキップ
    return req.url === '/health' || req.url === '/api/v1/health';
  },
});

// リクエストIDを生成するミドルウェア
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', (req as any).id);
  next();
};

// APIレスポンスログミドルウェア
export const apiResponseLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    // レスポンスログ
    log.info('API Response', {
      requestId: (req as any).id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id,
      userAgent: req.get('user-agent'),
    });

    return originalSend.call(this, data);
  };

  next();
};