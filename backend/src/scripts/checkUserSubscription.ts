import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';

dotenv.config();

async function checkUserSubscription(email: string) {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // ユーザーを検索
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', {
      email: user.email,
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription(),
    });

    // サブスクリプションの詳細を表示
    if (user.subscription) {
      console.log('\nSubscription details:');
      console.log('- Status:', user.subscription.status);
      console.log('- Plan:', user.subscription.plan);
      console.log('- Current Period End:', user.subscription.currentPeriodEnd);
      console.log('- Expires At:', user.subscription.expiresAt);
      console.log('- Stripe Customer ID:', user.subscription.stripeCustomerId);
      console.log('- Stripe Subscription ID:', user.subscription.stripeSubscriptionId);
      
      // 有効期限チェック
      const now = new Date();
      if (user.subscription.currentPeriodEnd) {
        console.log('\nCurrent Period End comparison:');
        console.log('- Current time:', now);
        console.log('- Period end:', user.subscription.currentPeriodEnd);
        console.log('- Is valid:', user.subscription.currentPeriodEnd > now);
      }
      
      if (user.subscription.expiresAt) {
        console.log('\nExpires At comparison:');
        console.log('- Current time:', now);
        console.log('- Expires at:', user.subscription.expiresAt);
        console.log('- Is valid:', user.subscription.expiresAt > now);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// コマンドライン引数からメールアドレスを取得
const email = process.argv[2];
if (!email) {
  console.log('Usage: ts-node checkUserSubscription.ts <email>');
  process.exit(1);
}

checkUserSubscription(email);