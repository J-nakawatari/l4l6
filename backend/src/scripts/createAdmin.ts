import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import readline from 'readline';

// 環境変数の読み込み
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createAdmin() {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDBに接続しました');

    // 管理者情報の入力
    console.log('\n管理者アカウントを作成します\n');
    
    const email = await question('メールアドレス: ');
    const password = await question('パスワード: ');
    const name = await question('名前: ');

    // メールアドレスの重複チェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.error('\n❌ このメールアドレスは既に管理者アカウントとして登録されています');
      } else {
        // 既存ユーザーを管理者に昇格
        const confirm = await question('\nこのメールアドレスは既に通常ユーザーとして登録されています。管理者に昇格しますか？ (yes/no): ');
        if (confirm.toLowerCase() === 'yes') {
          existingUser.role = 'admin';
          await existingUser.save();
          console.log('\n✅ ユーザーを管理者に昇格しました');
        } else {
          console.log('\n操作をキャンセルしました');
        }
      }
      process.exit(0);
    }

    // 新規管理者アカウントの作成
    const admin = await User.create({
      email,
      password,
      name,
      role: 'admin',
      emailVerified: true, // 管理者は最初からメール確認済み
    });

    console.log('\n✅ 管理者アカウントを作成しました');
    console.log(`   メールアドレス: ${admin.email}`);
    console.log(`   名前: ${admin.name}`);
    console.log(`   ID: ${admin._id}`);
    console.log('\n管理画面URL: http://localhost:3000/admin/login');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

// 直接実行された場合のみ実行
if (require.main === module) {
  createAdmin();
}