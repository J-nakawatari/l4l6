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

export const updateProfile = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement update profile
    res.json({ message: 'Update profile not implemented' });
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

    res.json({ message: 'アカウントを削除しました' });
  } catch (error) {
    next(error);
  }
};