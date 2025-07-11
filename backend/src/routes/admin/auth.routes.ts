import { Router } from 'express';
import { adminLogin, verify2FA, adminLogout } from '../../controllers/admin/auth.controller';
import { adminAuth } from '../../middleware/adminAuth';
import { Admin } from '../../models/Admin';

const router = Router();

router.post('/login', adminLogin);
router.post('/verify-2fa', verify2FA);
router.post('/logout', adminLogout);

// 管理者情報取得（認証必須）
router.get('/me', adminAuth, async (req: any, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin not found' } });
      return;
    }
    res.json({ admin });
  } catch {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get admin info' } });
  }
});

export default router;