import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ISubscription {
  status: 'active' | 'inactive' | 'cancelled';
  plan?: 'free' | 'basic';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  expiresAt?: Date;
}

export interface IUser extends Document<Types.ObjectId> {
  email: string;
  password: string;
  name: string;
  bio?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  suspended?: boolean;
  subscription?: ISubscription & { plan?: 'free' | 'basic' | 'premium'; planId?: string };
  emailNotifications?: {
    newPrediction: boolean;
    hitNotification: boolean;
    newsletter: boolean;
  };
  lastActiveAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasActiveSubscription(): boolean;
}

export interface IUserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'メールアドレスは必須です'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: '有効なメールアドレスを入力してください',
    },
  },
  password: {
    type: String,
    required: [true, 'パスワードは必須です'],
    minlength: [8, 'パスワードは8文字以上である必要があります'],
  },
  name: {
    type: String,
    required: [true, '名前は必須です'],
    trim: true,
    maxlength: [100, '名前は100文字以内で入力してください'],
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'プロフィールは500文字以内で入力してください'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  suspended: {
    type: Boolean,
    default: false,
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'inactive',
    },
    plan: {
      type: String,
      enum: ['free', 'basic'],
      default: 'free',
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    expiresAt: Date,
  },
  emailNotifications: {
    newPrediction: { type: Boolean, default: true },
    hitNotification: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
  },
  lastActiveAt: Date,
  deletedAt: Date,
}, {
  timestamps: true,
});

// インデックス
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.status': 1 });

// パスワードのハッシュ化
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// パスワード比較メソッド
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// サブスクリプション有効チェック
userSchema.methods.hasActiveSubscription = function(): boolean {
  if (!this.subscription) {
    return false;
  }
  
  // activeまたはcancelledで期限内なら有効
  if (this.subscription.status !== 'active' && this.subscription.status !== 'cancelled') {
    return false;
  }
  
  // currentPeriodEndまたはexpiresAtをチェック
  const expirationDate = this.subscription.currentPeriodEnd || this.subscription.expiresAt;
  if (!expirationDate) {
    return false;
  }
  
  return expirationDate > new Date();
};

// 静的メソッド
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);