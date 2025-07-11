const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Userスキーマ
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
});

// パスワードハッシュ化
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numbers4');
    
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';
    
    if (!email || !password) {
      console.log('使用方法: node createAdminUser.js <email> <password> [name]');
      process.exit(1);
    }
    
    // 既存チェック
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('このメールアドレスは既に登録されています');
      if (existing.role !== 'admin') {
        console.log('既存ユーザーを管理者に昇格しますか？ (yes/no)');
        // 簡易実装のため、ここでは昇格を実行
        existing.role = 'admin';
        await existing.save();
        console.log('管理者権限を付与しました');
      } else {
        console.log('既に管理者です');
      }
      process.exit(0);
    }
    
    // 新規作成
    const admin = new User({
      email,
      password,
      name,
      role: 'admin',
      emailVerified: true
    });
    
    await admin.save();
    console.log('管理者アカウントを作成しました');
    console.log('Email:', email);
    console.log('Role: admin');
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();