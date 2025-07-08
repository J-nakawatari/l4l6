import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { securityMiddleware } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId, httpLogging, apiResponseLogger } from './middleware/logging';
import { performanceMonitoring, errorRateMonitoring, memoryMonitoring } from './middleware/monitoring';
import { log } from './utils/logger';
import { connectDB } from './config/database';

// 環境変数の読み込み
dotenv.config();

// MongoDB接続
if (process.env.NODE_ENV !== 'test') {
  connectDB().catch((error) => {
    log.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
}

const app = express();

// Trust proxy設定（Nginxプロキシ経由のため）
app.set('trust proxy', 1);

// グローバルエラーハンドラー
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

// リクエストID生成
app.use(requestId);

// HTTPログ
app.use(httpLogging);

// パフォーマンスとエラー率モニタリング
app.use(performanceMonitoring);
app.use(errorRateMonitoring);

// Stripe Webhook用の生データを保持するミドルウェア（express.jsonより前に設定）
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// 基本的なミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// APIレスポンスログ
app.use(apiResponseLogger);

// セキュリティミドルウェアを適用
securityMiddleware.forEach(middleware => app.use(middleware));

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ルートを追加
import routes from './routes';
app.use(routes);

// エラーハンドリング
app.use(notFoundHandler);
app.use(errorHandler);

// メモリモニタリング開始
if (process.env.NODE_ENV !== 'test') {
  memoryMonitoring();
}

// 起動ログ
log.info('Application initialized', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV,
});

export default app;