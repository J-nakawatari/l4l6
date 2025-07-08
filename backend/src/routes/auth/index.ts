import { Router } from 'express';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  verifyEmailSchema,
  refreshTokenSchema 
} from '../../validation/auth.validation';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/security';
import { authenticate } from '../../middleware/auth';
import { AuthService } from '../../services/auth.service';
import { RouteRegistry } from '../../utils/routeRegistry';
import { log } from '../../utils/logger';

const router = Router();
const authService = new AuthService();

// ルート登録
RouteRegistry.register('POST', '/api/v1/auth/register');
RouteRegistry.register('POST', '/api/v1/auth/login');
RouteRegistry.register('POST', '/api/v1/auth/logout');
RouteRegistry.register('POST', '/api/v1/auth/refresh');
RouteRegistry.register('POST', '/api/v1/auth/verify-email');
RouteRegistry.register('POST', '/api/v1/auth/forgot-password');
RouteRegistry.register('POST', '/api/v1/auth/reset-password');

// ユーザー登録
router.post('/register', 
  authLimiter,
  validate(registerSchema), 
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ログイン
router.post('/login',
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { user, refreshToken, accessToken } = await authService.login(req.body);
      
      // JWTトークンをHttpOnly Cookieに設定
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000, // 2時間
      });

      res.status(200).json({ user, refreshToken });
    } catch (error) {
      next(error);
    }
  }
);

// ログアウト
router.post('/logout',
  authenticate,
  async (req, res, next) => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
      await authService.logout((req as any).user!.id, token);
      
      // Cookieをクリア
      res.clearCookie('token');
      
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }
);

// トークンリフレッシュ
router.post('/refresh',
  validate(refreshTokenSchema),
  async (req, res, next) => {
    try {
      const { accessToken, user } = await authService.refreshAccessToken(req.body.refreshToken);
      
      // 新しいトークンをCookieに設定
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000, // 2時間
      });

      res.status(200).json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  }
);

// メールアドレス確認
router.post('/verify-email',
  validate(verifyEmailSchema),
  async (req, res, next) => {
    try {
      await authService.verifyEmail(req.body.token);
      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// パスワードリセット申請
router.post('/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res, _next) => {
    try {
      await authService.forgotPassword(req.body.email);
      
      // セキュリティのため、常に同じレスポンスを返す
      res.status(200).json({ 
        message: 'If the email exists, a password reset link has been sent' 
      });
    } catch (error) {
      // エラーでも同じレスポンスを返す
      log.error('Password reset error', { error });
      res.status(200).json({ 
        message: 'If the email exists, a password reset link has been sent' 
      });
    }
  }
);

// パスワードリセット実行
router.post('/reset-password',
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;