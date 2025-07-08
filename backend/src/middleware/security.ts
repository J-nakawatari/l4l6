import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// import mongoSanitize from 'express-mongo-sanitize';
import cors from 'cors';

// レート制限の設定
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false, // プロキシ環境での一時的な回避策
});

// 認証用の厳しいレート制限
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5リクエスト
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  skip: () => false, // プロキシ環境での一時的な回避策
});

// CORS設定
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://l4l6.com',
      'https://www.l4l6.com'
    ];
    
    // 開発環境では全てのオリジンを許可
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// セキュリティミドルウェアの配列
export const securityMiddleware = [
  // セキュリティヘッダー
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  
  // CORS
  cors(corsOptions),
  
  // NoSQLインジェクション対策
  // mongoSanitize(), // TODO: Fix compatibility with Express 5
  
  // 一般的なレート制限
  limiter,
];