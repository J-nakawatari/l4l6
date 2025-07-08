import { User, IUser } from '../models/User';
import { Prediction } from '../models/Prediction';
import { PredictionResult } from '../models/PredictionResult';
import { AppError } from '../middleware/errorHandler';
import { log } from '../utils/logger';
import { sendEmail } from '../utils/email';
import { cancelStripeSubscription } from './stripe.service';
import mongoose from 'mongoose';

interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled';
  emailVerified?: boolean;
  sort?: string;
}

interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  granularity?: 'day' | 'week' | 'month' | 'year';
}

export class AdminService {
  // ユーザー管理
  async getUsers(query: UserListQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      subscriptionStatus,
      emailVerified,
      sort = '-createdAt',
    } = query;

    const filter: any = { deletedAt: { $exists: false } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    if (subscriptionStatus) filter['subscription.status'] = subscriptionStatus;
    if (emailVerified !== undefined) filter.emailVerified = emailVerified;

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUserById(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // 統計情報を取得
    const stats = await this.getUserStats(userId);
    
    // アクティビティログを取得
    const activities = await this.getUserActivities(userId);

    return { user, stats, activities };
  }

  async updateUser(userId: string, updates: any) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // 更新可能なフィールドのみ
    const allowedUpdates = ['name', 'role', 'emailVerified', 'isSuspended', 'suspendReason', 'subscription'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        (user as any)[key] = updates[key];
      }
    });

    await user.save();

    log.info('User updated by admin', { userId, adminId: 'current-admin', updates });

    return user;
  }

  async deleteUser(adminId: string, userId: string, reason: string, permanent: boolean = false) {
    if (adminId === userId) {
      throw new AppError('Cannot delete yourself', 400, 'CANNOT_DELETE_SELF');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // サブスクリプションキャンセル
    if (user.subscription?.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(user.subscription.stripeSubscriptionId, true);
      } catch (error) {
        log.error('Failed to cancel subscription during deletion', { userId, error });
      }
    }

    if (permanent) {
      await User.deleteOne({ _id: userId });
      log.info('User permanently deleted', { userId, adminId, reason });
    } else {
      user.deletedAt = new Date();
      user.email = `deleted_${user._id}_${user.email}`;
      await user.save();
      log.info('User soft deleted', { userId, adminId, reason });
    }

    return { message: 'User deleted successfully' };
  }

  async sendEmailToUser(userId: string, emailData: any) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // テンプレートベースまたはカスタムメール
    if (emailData.template) {
      // テンプレート処理
      await this.sendTemplatedEmail(user, emailData.template, emailData.variables);
    } else {
      // カスタムメール
      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.message,
        text: emailData.message,
      });
    }

    log.info('Email sent to user', { userId, subject: emailData.subject });

    return { message: 'Email sent successfully' };
  }

  // 統計・分析
  async getOverviewAnalytics(query: AnalyticsQuery) {
    const { startDate, endDate } = query;
    const dateFilter: any = {};
    
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const [
      totalUsers,
      activeUsers,
      subscribedUsers,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: { $exists: false } }),
      User.countDocuments({ 
        lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        deletedAt: { $exists: false },
      }),
      User.countDocuments({ 
        'subscription.status': 'active',
        deletedAt: { $exists: false },
      }),
    ]);

    // 収益計算（仮実装）
    const monthlyRevenue = subscribedUsers * 1000; // 月額1000円と仮定
    const totalRevenue = monthlyRevenue * 12; // 年間収益

    // 成長率計算
    const lastMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });

    const thisMonthUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const growthRate = lastMonthUsers > 0 
      ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 
      : 0;

    return {
      overview: {
        totalUsers,
        activeUsers,
        subscribedUsers,
        totalRevenue,
        monthlyRevenue,
      },
      growth: {
        newUsersToday: await User.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        newUsersThisMonth: thisMonthUsers,
        churnRate: 5.2, // 仮の値
        growthRate: Math.round(growthRate * 10) / 10,
      },
      predictions: await this.getPredictionAnalytics(),
    };
  }

  async getRevenueAnalytics(query: any) {
    const { view = 'overview', months = 12 } = query;

    const activeSubscriptions = await User.countDocuments({
      'subscription.status': 'active',
    });

    const monthlyPrice = 1000; // 月額料金

    const mrr = activeSubscriptions * monthlyPrice;
    const arr = mrr * 12;
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
    
    // LTV計算（平均継続月数 × 月額料金）
    const avgRetentionMonths = 8; // 仮の値
    const ltv = avgRetentionMonths * monthlyPrice;

    const result: any = {
      current: {
        monthly: mrr,
        yearly: arr,
        total: arr, // 簡略化
      },
      mrr,
      arr,
      arpu: Math.round(arpu),
      ltv: Math.round(ltv),
    };

    if (view === 'monthly') {
      result.monthlyRevenue = await this.getMonthlyRevenue(months);
    }

    if (view === 'by-plan') {
      result.planBreakdown = await this.getPlanBreakdown();
    }

    return result;
  }

  async getUserAnalytics() {
    const total = await User.countDocuments({ deletedAt: { $exists: false } });
    const verified = await User.countDocuments({ 
      emailVerified: true,
      deletedAt: { $exists: false },
    });

    // アクティブユーザー計算
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau] = await Promise.all([
      User.countDocuments({ lastActiveAt: { $gte: dayAgo } }),
      User.countDocuments({ lastActiveAt: { $gte: weekAgo } }),
      User.countDocuments({ lastActiveAt: { $gte: monthAgo } }),
    ]);

    // リテンション率（仮実装）
    const retention = {
      day1: 80,
      day7: 65,
      day30: 45,
    };

    return {
      demographics: {
        total,
        verified,
        unverified: total - verified,
      },
      activity: {
        dau,
        wau,
        mau,
      },
      retention,
    };
  }

  async getPredictionAnalytics() {
    const predictions = await Prediction.find();
    const results = await PredictionResult.find();

    const totalPredictions = predictions.length;
    const totalViews = predictions.reduce((sum, p) => sum + p.viewCount, 0);
    const totalHits = results.filter(r => r.hits.dataLogic.length > 0 || r.hits.ai.length > 0).length;

    const dataLogicHits = results.filter(r => r.hits.dataLogic.length > 0).length;
    const aiHits = results.filter(r => r.hits.ai.length > 0).length;

    return {
      performance: {
        totalPredictions,
        totalHits,
        overallHitRate: totalPredictions > 0 ? (totalHits / totalPredictions) * 100 : 0,
        dataLogicHitRate: totalPredictions > 0 ? (dataLogicHits / totalPredictions) * 100 : 0,
        aiHitRate: totalPredictions > 0 ? (aiHits / totalPredictions) * 100 : 0,
      },
      popularity: {
        totalViews,
        averageViewsPerPrediction: totalPredictions > 0 ? totalViews / totalPredictions : 0,
        mostViewedPredictions: await Prediction.find()
          .sort('-viewCount')
          .limit(5)
          .select('drawNumber viewCount'),
      },
    };
  }

  // ヘルパーメソッド
  private async getUserStats(userId: string) {
    const user = await User.findById(userId);
    const predictions = await PredictionResult.find({ userId });
    
    const totalSpent = user?.subscription?.status === 'active' ? 1000 * 6 : 0; // 仮の計算

    return {
      totalPredictionsViewed: predictions.length,
      totalSpent,
      lastLoginAt: user?.lastActiveAt || user?.createdAt,
    };
  }

  private async getUserActivities(_userId: string) {
    // アクティビティログの実装（仮）
    return [
      {
        type: 'login',
        timestamp: new Date(),
        details: { ip: '192.168.1.1' },
      },
      {
        type: 'subscription_started',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        details: { plan: 'monthly' },
      },
    ];
  }

  private async sendTemplatedEmail(user: IUser, template: string, variables: any) {
    // テンプレートメール送信の実装
    const templates: any = {
      subscription_reminder: {
        subject: 'サブスクリプションのご案内',
        body: `${user.name}様、現在${variables.discount}の割引キャンペーン中です！`,
      },
    };

    const { subject, body } = templates[template] || {};
    
    await sendEmail({
      to: user.email,
      subject,
      html: body,
      text: body,
    });
  }

  private async getMonthlyRevenue(months: number) {
    // 月別収益の実装（仮）
    const monthlyData = [];
    for (let i = 0; i < months; i++) {
      monthlyData.push({
        month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
        revenue: Math.floor(Math.random() * 1000000) + 500000,
        subscriptions: Math.floor(Math.random() * 100) + 50,
        churn: Math.floor(Math.random() * 10) + 5,
      });
    }
    return monthlyData.reverse();
  }

  private async getPlanBreakdown() {
    // プラン別内訳（仮実装）
    return {
      monthly: {
        subscribers: 800,
        revenue: 800000,
        percentage: 80,
      },
      yearly: {
        subscribers: 200,
        revenue: 2000000,
        percentage: 20,
      },
    };
  }
}