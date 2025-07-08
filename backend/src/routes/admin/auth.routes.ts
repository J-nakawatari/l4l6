import { Router } from 'express';
import { adminLogin, verify2FA, adminLogout } from '../../controllers/admin/auth.controller';

const router = Router();

router.post('/login', adminLogin);
router.post('/verify-2fa', verify2FA);
router.post('/logout', adminLogout);

export default router;