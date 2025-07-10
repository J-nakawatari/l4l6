import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';
import Stripe from 'stripe';
import { log } from '../../utils/logger';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query: any = {};

    // 検索条件
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // ステータスフィルター
    if (status === 'active') {
      query.suspended = { $ne: true };
    } else if (status === 'suspended') {
      query.suspended = true;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement get user by ID
    res.json({ message: 'Get user by ID not implemented' });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    // アカウント停止/再開
    if (action === 'suspend') {
      user.suspended = true;
      await user.save();
      res.json({ message: 'User suspended successfully', user });
    } else if (action === 'activate') {
      user.suspended = false;
      await user.save();
      res.json({ message: 'User activated successfully', user });
    } else {
      res.status(400).json({ error: { code: 'INVALID_ACTION', message: 'Invalid action' } });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Stripeサブスクリプションのキャンセル
    if (user.subscription?.stripeSubscriptionId) {
      try {
        // Stripeインスタンスはpayment.tsと同じように初期化
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2025-06-30.basil',
        });
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch (error) {
        // エラーがあってもユーザー削除は続行
        log.error('Failed to cancel Stripe subscription during user deletion', { error });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// メール送信機能は削除（不要な機能のため）