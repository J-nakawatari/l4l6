import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'admin';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: [true, 'メールアドレスは必須です'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: '有効なメールアドレスを入力してください',
    },
  },
  password: {
    type: String,
    required: [true, 'パスワードは必須です'],
    minlength: [8, 'パスワードは8文字以上必要です'],
  },
  name: {
    type: String,
    required: [true, '名前は必須です'],
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

// パスワードのハッシュ化
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// パスワード比較メソッド
adminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// インデックス
adminSchema.index({ email: 1 });

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);