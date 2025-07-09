import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';

dotenv.config();

async function activateSubscription(email: string) {
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
      currentSubscription: user.subscription,
    });

    // サブスクリプションを手動で有効化
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    user.subscription = {
      status: 'active',
      plan: 'basic',
      currentPeriodEnd: expiresAt,
      expiresAt: expiresAt,
    };

    await user.save();

    console.log('\nSubscription activated:', {
      email: user.email,
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription(),
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// コマンドライン引数からメールアドレスを取得
const email = process.argv[2];
if (!email) {
  console.log('Usage: ts-node activateSubscription.ts <email>');
  process.exit(1);
}

activateSubscription(email);