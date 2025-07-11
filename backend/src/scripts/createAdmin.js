const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Adminスキーマ
const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    default: 'admin',
  },
  permissions: [{
    type: String,
    enum: ['users:read', 'users:write', 'users:delete', 'system:manage'],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: Date,
  twoFactorSecret: String,
}, {
  timestamps: true,
});

// パスワードハッシュ化
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Admin = mongoose.model('Admin', AdminSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier');
    
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Administrator';
    const role = process.argv[5] || 'admin';
    
    if (!email || !password) {
      console.log('使用方法: node createAdmin.js <email> <password> [name] [role]');
      console.log('role: admin または superadmin');
      process.exit(1);
    }
    
    // 既存チェック
    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log('このメールアドレスは既に登録されています');
      process.exit(1);
    }
    
    // デフォルト権限
    const defaultPermissions = role === 'superadmin' 
      ? ['users:read', 'users:write', 'users:delete', 'system:manage']
      : ['users:read', 'users:write'];
    
    // 新規作成
    const admin = new Admin({
      email,
      password,
      name,
      role,
      permissions: defaultPermissions,
      isActive: true
    });
    
    await admin.save();
    console.log('管理者アカウントを作成しました');
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Role:', role);
    console.log('Permissions:', defaultPermissions.join(', '));
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();