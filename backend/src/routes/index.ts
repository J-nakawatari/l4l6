import { Router } from 'express';
import authRoutes from './auth';
import docsRoutes from './docs';
import userRoutes from './user.routes';
import predictionRoutes from './prediction.routes';
import adminRoutes from './admin.routes';
import { RouteRegistry } from '../utils/routeRegistry';

const router = Router();

// API v1ルート
const v1Router = Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/predictions', predictionRoutes);
v1Router.use('/admin', adminRoutes);

// TODO: 他のルートを追加
// v1Router.use('/subscribe', subscribeRoutes);

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