import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createAdmin, createSubscribedUser, resetUserCounter } from '../factories/user.factory';
import { getAuthToken } from '../helpers/auth';
import { User } from '../../src/models/User';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  resetUserCounter();
});

afterEach(async () => {
  await clearTestDB();
});

describe('GET /api/v1/admin/users', () => {
  const usersEndpoint = '/api/v1/admin/users';
  
  describe('正常系', () => {
    it('管理者は全ユーザーリストを取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // テストユーザーを作成
      await createUser({ name: 'ユーザー1' });
      await createUser({ name: 'ユーザー2' });
      await createSubscribedUser({ name: 'サブスクユーザー' });

      const response = await request(app)
        .get(usersEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(4); // 管理者含む
      expect(response.body.total).toBe(4);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('ページネーションが機能する', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // 25人のユーザーを作成
      for (let i = 1; i <= 25; i++) {
        await createUser({ name: `ユーザー${i}` });
      }

      const response = await request(app)
        .get(usersEndpoint)
        .query({ page: 2, limit: 10 })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(10);
      expect(response.body.page).toBe(2);
      expect(response.body.totalPages).toBe(3);
    });

    it('フィルタリングが機能する', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      await createUser({ name: '田中太郎' });
      await createUser({ name: '山田花子' });
      await createSubscribedUser({ name: '佐藤一郎' });

      // 名前でフィルタ
      const response = await request(app)
        .get(usersEndpoint)
        .query({ search: '田中' })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].name).toBe('田中太郎');
    });

    it('サブスクリプション状態でフィルタできる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      await createUser({ name: '無料ユーザー' });
      await createSubscribedUser({ name: '有料ユーザー1' });
      await createSubscribedUser({ name: '有料ユーザー2' });

      const response = await request(app)
        .get(usersEndpoint)
        .query({ subscriptionStatus: 'active' })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users.every((u: any) => u.subscription?.status === 'active')).toBe(true);
    });

    it('ソートが機能する', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      await createUser({ name: 'Aユーザー' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createUser({ name: 'Bユーザー' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createUser({ name: 'Cユーザー' });

      const response = await request(app)
        .get(usersEndpoint)
        .query({ sort: '-createdAt' }) // 新しい順
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users[0].name).toBe('Cユーザー');
      expect(response.body.users[1].name).toBe('Bユーザー');
    });
  });

  describe('権限エラー', () => {
    it('一般ユーザーはユーザーリストを取得できない', async () => {
      const user = await createUser();
      const userToken = getAuthToken(user);

      const response = await request(app)
        .get(usersEndpoint)
        .set('Cookie', `token=${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('未認証ユーザーはアクセスできない', async () => {
      const response = await request(app)
        .get(usersEndpoint);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

describe('GET /api/v1/admin/users/:id', () => {
  const getUserEndpoint = (id: string) => `/api/v1/admin/users/${id}`;
  
  describe('正常系', () => {
    it('管理者は特定ユーザーの詳細を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createSubscribedUser({
        name: 'ターゲットユーザー',
        email: 'target@example.com',
      });

      const response = await request(app)
        .get(getUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: (targetUser as any)._id.toString(),
        name: 'ターゲットユーザー',
        email: 'target@example.com',
        role: 'user',
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('統計情報も含まれる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      const targetUser = await createUser();

      const response = await request(app)
        .get(getUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        totalPredictionsViewed: expect.any(Number),
        totalSpent: expect.any(Number),
        lastLoginAt: expect.any(String),
      });
    });

    it('アクティビティログも含まれる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      const targetUser = await createUser();

      const response = await request(app)
        .get(getUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeDefined();
      expect(Array.isArray(response.body.activities)).toBe(true);
    });
  });

  describe('エラーケース', () => {
    it('存在しないユーザーIDは404エラー', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(getUserEndpoint('507f1f77bcf86cd799439011'))
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('無効なユーザーIDは400エラー', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(getUserEndpoint('invalid-id'))
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });
});

describe('PUT /api/v1/admin/users/:id', () => {
  const updateUserEndpoint = (id: string) => `/api/v1/admin/users/${id}`;
  
  describe('正常系', () => {
    it('管理者はユーザー情報を更新できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser({
        name: '更新前',
        role: 'user',
      });

      const updateData = {
        name: '更新後',
        emailVerified: true,
        role: 'admin',
      };

      const response = await request(app)
        .put(updateUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('更新後');
      expect(response.body.user.emailVerified).toBe(true);
      expect(response.body.user.role).toBe('admin');
    });

    it('サブスクリプション状態を手動で変更できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .put(updateUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({
          subscription: {
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.user.subscription.status).toBe('active');
    });

    it('ユーザーの凍結/凍結解除ができる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .put(updateUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({
          isSuspended: true,
          suspendReason: 'Terms of service violation',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isSuspended).toBe(true);
      expect(response.body.user.suspendReason).toBe('Terms of service violation');
    });
  });

  describe('バリデーション', () => {
    it('メールアドレスは変更できない', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser({ email: 'original@example.com' });

      const response = await request(app)
        .put(updateUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({ email: 'new@example.com' });

      expect(response.status).toBe(200);
      
      // メールアドレスは変更されていない
      const updatedUser = await User.findById(targetUser._id);
      expect(updatedUser?.email).toBe('original@example.com');
    });

    it('パスワードは直接変更できない', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .put(updateUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({ password: 'NewPassword123!' });

      expect(response.status).toBe(200);
      
      // パスワードは変更されていない
      const updatedUser = await User.findById(targetUser._id);
      expect(await updatedUser?.comparePassword('SecurePass123!')).toBe(true);
    });
  });
});

describe('DELETE /api/v1/admin/users/:id', () => {
  const deleteUserEndpoint = (id: string) => `/api/v1/admin/users/${id}`;
  
  describe('正常系', () => {
    it('管理者はユーザーを削除できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .delete(deleteUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({ reason: 'Test deletion' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
      
      // ユーザーが削除されている（論理削除）
      const deletedUser = await User.findById(targetUser._id);
      expect(deletedUser?.deletedAt).toBeDefined();
    });

    it('サブスクリプションも同時にキャンセルされる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createSubscribedUser();

      const response = await request(app)
        .delete(deleteUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({ reason: 'Account violation' });

      expect(response.status).toBe(200);
      // Stripeのサブスクリプションキャンセルが呼ばれることを確認
    });
  });

  describe('制限事項', () => {
    it('管理者は自分自身を削除できない', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .delete(deleteUserEndpoint(admin._id))
        .set('Cookie', `token=${adminToken}`)
        .send({ reason: 'Self deletion' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CANNOT_DELETE_SELF');
    });

    it('削除理由は必須', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .delete(deleteUserEndpoint((targetUser as any)._id))
        .set('Cookie', `token=${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('POST /api/v1/admin/users/:id/send-email', () => {
  const sendEmailEndpoint = (id: string) => `/api/v1/admin/users/${id}/send-email`;
  
  describe('正常系', () => {
    it('管理者は個別ユーザーにメールを送信できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const emailData = {
        subject: '重要なお知らせ',
        message: 'サービスメンテナンスのお知らせです。',
        type: 'notification',
      };

      const response = await request(app)
        .post(sendEmailEndpoint(targetUser._id))
        .set('Cookie', `token=${adminToken}`)
        .send(emailData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email sent successfully');
    });

    it('テンプレートを使用してメールを送信できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);
      
      const targetUser = await createUser();

      const response = await request(app)
        .post(sendEmailEndpoint(targetUser._id))
        .set('Cookie', `token=${adminToken}`)
        .send({
          template: 'subscription_reminder',
          variables: {
            discount: '20%',
            expiryDate: '2024-12-31',
          },
        });

      expect(response.status).toBe(200);
    });
  });
});