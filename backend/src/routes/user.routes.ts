import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProfile, updateProfile, deleteAccount } from '../controllers/user.controller';

const router = Router();

// すべてのユーザールートは認証が必要
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/profile', deleteAccount);

export default router;