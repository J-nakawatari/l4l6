import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import adminAuthRoutes from './admin/auth.routes';
import adminUserRoutes from './admin/users.routes';

const router = Router();

// 管理者認証ルート（認証不要）
router.use('/auth', adminAuthRoutes);

// 以下のルートはすべて管理者認証が必要
router.use(adminAuth);

router.use('/users', adminUserRoutes);

export default router;