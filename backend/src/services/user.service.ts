import { User, IUser } from '../models/User';
import { Prediction } from '../models/Prediction';
import { PredictionResult } from '../models/PredictionResult';
import { AppError } from '../middleware/errorHandler';
import { log } from '../utils/logger';
import { cancelStripeSubscription } from './stripe.service';

interface ProfileData {
  name?: string;
  bio?: string;
  emailNotifications?: {
    newPrediction?: boolean;
    hitNotification?: boolean;
    newsletter?: boolean;
  };
}

interface UserStats {
  totalPredictionsViewed: number;
  hitRate: number;
  memberSince: Date;
  lastActive?: Date;
}

export class UserService {
  async getProfile(userId: string): Promise<{ user: Partial<IUser>; stats: UserStats }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // 統計情報を取得
    const stats = await this.getUserStats(userId);

    // パスワードを除外
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      role: user.role,
      emailVerified: user.emailVerified,
      subscription: user.subscription,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userResponse, stats };
  }

  async updateProfile(userId: string, data: ProfileData): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // 更新可能なフィールドのみ更新
    if (data.name !== undefined) user.name = data.name;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.emailNotifications !== undefined) {
      user.emailNotifications = {
        ...user.emailNotifications,
        ...data.emailNotifications,
      };
    }

    await user.save();

    log.info('Profile updated', { userId, updatedFields: Object.keys(data) });

    // パスワードを除外して返す
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      role: user.role,
      emailVerified: user.emailVerified,
      subscription: user.subscription,
      emailNotifications: user.emailNotifications,
    };

    return userResponse;
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // パスワード確認
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
    }

    // サブスクリプションがある場合はキャンセル
    if (user.subscription?.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(user.subscription.stripeSubscriptionId, true);
      } catch (error) {
        log.error('Failed to cancel subscription during account deletion', { userId, error });
      }
    }

    // ユーザーデータを論理削除または物理削除
    // 論理削除の場合
    user.deletedAt = new Date();
    user.email = `deleted_${user._id}_${user.email}`; // メールアドレスを無効化
    await user.save();

    // または物理削除
    // await User.deleteOne({ _id: userId });

    log.info('Account deleted', { userId });
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // 閲覧した予想数を取得
    const viewedPredictions = await Prediction.countDocuments({
      viewers: userId, // viewersフィールドがあると仮定
    });

    // 的中率を計算
    const predictionResults = await PredictionResult.find({ userId });
    const totalPredictions = predictionResults.length;
    const hits = predictionResults.filter(r => r.hits.dataLogic.length > 0 || r.hits.ai.length > 0).length;
    const hitRate = totalPredictions > 0 ? (hits / totalPredictions) * 100 : 0;

    return {
      totalPredictionsViewed: viewedPredictions,
      hitRate: Math.round(hitRate * 10) / 10, // 小数点1位まで
      memberSince: user.createdAt,
      lastActive: user.lastActiveAt,
    };
  }

  async getSubscriptionInfo(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.subscription) {
      return {
        status: 'inactive',
        isActive: false,
      };
    }

    const { subscription } = user;
    const now = new Date();
    const isActive = user.hasActiveSubscription();
    const daysRemaining = subscription.currentPeriodEnd
      ? Math.max(0, Math.floor((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isActive,
      daysRemaining,
    };
  }
}