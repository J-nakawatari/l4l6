import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProfile, updateProfile, deleteAccount, changePassword } from '../controllers/user.controller';

const router = Router();

// すべてのユーザールートは認証が必要
router.use(authenticate);

router.get('/me', getProfile);
router.get('/profile', getProfile); // 後方互換性のため
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.delete('/profile', deleteAccount);

export default router;