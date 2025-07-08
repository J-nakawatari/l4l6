import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, IUser } from '../../src/models/User';
import bcrypt from 'bcrypt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('ユーザー作成', () => {
    it('有効なデータでユーザーを作成できる', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
        role: 'user' as const,
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe('user');
      expect(user.emailVerified).toBe(false);
      expect(user.password).not.toBe(userData.password); // ハッシュ化されている
    });

    it('パスワードが自動的にハッシュ化される', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      };

      const user = await User.create(userData);
      const isPasswordValid = await bcrypt.compare(userData.password, user.password);

      expect(isPasswordValid).toBe(true);
    });

    it('重複したメールアドレスは拒否される', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      };

      await User.create(userData);

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('無効なメールアドレスは拒否される', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('短いパスワードは拒否される', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        name: 'テストユーザー',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('サブスクリプション管理', () => {
    it('サブスクリプション情報を更新できる', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      });

      user.subscription = {
        status: 'active',
        stripeCustomerId: 'cus_test123',
        stripeSubscriptionId: 'sub_test123',
        currentPeriodEnd: new Date('2024-12-31'),
      };

      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.subscription?.status).toBe('active');
      expect(updatedUser?.subscription?.stripeCustomerId).toBe('cus_test123');
    });

    it('サブスクリプションの有効期限をチェックできる', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test123',
          stripeSubscriptionId: 'sub_test123',
          currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1日後
        },
      });

      expect(user.hasActiveSubscription()).toBe(true);

      // 期限切れのサブスクリプション
      user.subscription.currentPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1日前
      expect(user.hasActiveSubscription()).toBe(false);
    });
  });

  describe('ユーザー検索', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          password: 'SecurePass123!',
          name: 'ユーザー1',
          role: 'user',
        },
        {
          email: 'admin@example.com',
          password: 'SecurePass123!',
          name: '管理者',
          role: 'admin',
        },
      ]);
    });

    it('メールアドレスでユーザーを検索できる', async () => {
      const user = await User.findByEmail('user1@example.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('user1@example.com');
    });

    it('ロールでユーザーを検索できる', async () => {
      const admins = await User.find({ role: 'admin' });
      expect(admins).toHaveLength(1);
      expect(admins[0].email).toBe('admin@example.com');
    });
  });

  describe('パスワード検証', () => {
    it('正しいパスワードを検証できる', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      });

      const isValid = await user.comparePassword('SecurePass123!');
      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否する', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
      });

      const isValid = await user.comparePassword('WrongPassword123!');
      expect(isValid).toBe(false);
    });
  });
});