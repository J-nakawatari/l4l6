import { Router } from 'express';
import authRoutes from './auth';
import docsRoutes from './docs';
import userRoutes from './user.routes';
import predictionRoutes from './prediction.routes';
import adminRoutes from './admin.routes';
import paymentRoutes from './payment';
import drawResultsRoutes from './drawResults';
import backtestRoutes from './backtest';
import debugRoutes from './debug'; // 追加
import { RouteRegistry } from '../utils/routeRegistry';

const router = Router();

// API v1ルート
const v1Router = Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/predictions', predictionRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/draw-results', drawResultsRoutes);
v1Router.use('/backtest', backtestRoutes);

// デバッグルート（本番環境でも有効）
v1Router.use('/debug', debugRoutes);

// メインルーターに統合
router.use('/api/v1', v1Router);

// 開発環境でのみSwagger UIを有効化
if (process.env.NODE_ENV !== 'production') {
  router.use('/api/docs', docsRoutes);
}

// 開発環境でルート一覧を表示
if (process.env.NODE_ENV === 'development') {
  router.get('/api/routes', (_req, res) => {
    res.json({
      routes: RouteRegistry.getRoutes(),
      total: RouteRegistry.getRoutes().length,
    });
  });
}

export default router;