import { User, IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import crypto from 'crypto';
import { log } from '../utils/logger';

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<{ message: string; emailSent: boolean }> {
    const { email, password, name } = data;

    // メールアドレスの重複チェック
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // ユーザー作成
    const user = await User.create({
      email,
      password,
      name,
      role: 'user',
      emailVerified: false,
    });

    // メール確認トークン生成
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // トークンをRedisに保存（実装省略）
    // await redis.set(`email-verify:${verificationToken}`, (user as any)._id, 'EX', 86400); // 24時間

    // 確認メール送信
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      
      log.info('User registered', { userId: (user as any)._id, email: user.email });
      
      return {
        message: 'Registration successful',
        emailSent: true,
      };
    } catch (error) {
      log.error('Failed to send verification email', { userId: (user as any)._id, error });
      
      return {
        message: 'Registration successful',
        emailSent: false,
      };
    }
  }

  async login(data: LoginData): Promise<{ user: Partial<IUser>; refreshToken: string; accessToken: string }> {
    const { email, password } = data;

    // ユーザー検索
    const user = await User.findByEmail(email);
    
    // タイミング攻撃を防ぐため、ユーザーが存在しない場合も同じ処理時間にする
    if (!user) {
      await this.fakePasswordCompare();
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // パスワード検証
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // メール確認チェック
    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in', 403, 'EMAIL_NOT_VERIFIED');
    }

    // トークン生成
    const tokenPayload = {
      id: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // リフレッシュトークンをRedisに保存（実装省略）
    // await redis.set(`refresh:${refreshToken}`, (user as any)._id, 'EX', 604800); // 7日間

    log.info('User logged in', { userId: (user as any)._id, email: user.email });

    // パスワードを除外してユーザー情報を返す
    const userResponse = {
      id: (user as any)._id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      subscription: user.subscription,
    };

    return {
      user: userResponse,
      refreshToken,
      accessToken,
    };
  }

  async logout(userId: string, _token: string): Promise<void> {
    // トークンをブラックリストに追加（実装省略）
    // await redis.set(`blacklist:${token}`, '1', 'EX', 7200); // 2時間

    log.info('User logged out', { userId });
  }

  async verifyEmail(_token: string): Promise<void> {
    // トークンからユーザーIDを取得（実装省略）
    // const userId = await redis.get(`email-verify:${token}`);
    const userId = 'dummy'; // 仮実装

    if (!userId) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    user.emailVerified = true;
    await user.save();

    // トークンを削除（実装省略）
    // await redis.del(`email-verify:${token}`);

    log.info('Email verified', { userId: (user as any)._id });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    
    // セキュリティのため、ユーザーが存在しない場合もエラーを出さない
    if (!user) {
      return;
    }

    // リセットトークン生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // トークンをRedisに保存（実装省略）
    // await redis.set(`password-reset:${resetToken}`, (user as any)._id, 'EX', 3600); // 1時間

    // パスワードリセットメール送信
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
      log.info('Password reset email sent', { userId: (user as any)._id });
    } catch (error) {
      log.error('Failed to send password reset email', { userId: (user as any)._id, error });
      throw new AppError('Failed to send reset email', 500, 'EMAIL_SEND_FAILED');
    }
  }

  async resetPassword(_token: string, newPassword: string): Promise<void> {
    // トークンからユーザーIDを取得（実装省略）
    // const userId = await redis.get(`password-reset:${token}`);
    const userId = 'dummy'; // 仮実装

    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    user.password = newPassword;
    await user.save();

    // トークンを削除（実装省略）
    // await redis.del(`password-reset:${token}`);

    log.info('Password reset successful', { userId: (user as any)._id });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: Partial<IUser> }> {
    try {
      // トークンを検証
      const payload = verifyToken(refreshToken, true);
      
      // Redisでトークンの有効性を確認（実装省略）
      // const exists = await redis.exists(`refresh:${refreshToken}`);
      const exists = true; // 仮実装

      if (!exists) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // ユーザー情報を取得
      const user = await User.findById(payload.id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // 新しいアクセストークンを生成
      const newTokenPayload = {
        id: (user as any)._id.toString(),
        email: user.email,
        role: user.role,
      };

      const accessToken = generateToken(newTokenPayload);

      const userResponse = {
        id: (user as any)._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        subscription: user.subscription,
      };

      return {
        accessToken,
        user: userResponse,
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  // タイミング攻撃対策用のダミー処理
  private async fakePasswordCompare(): Promise<void> {
    // const dummyHash = '$2b$10$dummyhash1234567890abcdefghijklmnopqrstuvwxyz';
    await crypto.pbkdf2Sync('dummy', 'salt', 1000, 64, 'sha512');
  }
}