import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import Stripe from 'stripe';
import { log } from '../utils/logger';

// Stripeインスタンスを遅延初期化
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return stripe!;
}

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, bio } = req.body;

    // バリデーション
    if (name && name.length > 100) {
      res.status(400).json({ error: { code: 'NAME_TOO_LONG', message: 'Name must be 100 characters or less' } });
      return;
    }

    if (bio && bio.length > 500) {
      res.status(400).json({ error: { code: 'BIO_TOO_LONG', message: 'Bio must be 500 characters or less' } });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Current password and new password are required' } });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 現在のパスワードを確認
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      res.status(401).json({ error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
      return;
    }

    // 新しいパスワードを設定
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ error: { code: 'REASON_REQUIRED', message: 'Deletion reason is required' } });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Stripeのサブスクリプションをキャンセル
    if (user.subscription?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        await getStripe().subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch (error) {
        log.error('Failed to cancel Stripe subscription', { error });
      }
    }

    // アカウントを完全に削除
    await User.findByIdAndDelete(userId);

    // Cookieをクリア
    res.clearCookie('token');

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};