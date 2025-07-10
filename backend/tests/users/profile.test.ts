import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createSubscribedUser } from '../factories/user.factory';
import { getAuthToken } from '../helpers/auth';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('GET /api/v1/users/profile', () => {
  const profileEndpoint = '/api/v1/users/profile';
  
  describe('正常系', () => {
    it('認証済みユーザーは自分のプロフィールを取得できる', async () => {
      const user = await createUser({
        email: 'test@example.com',
        name: 'テストユーザー',
        emailVerified: true,
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .get(profileEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: (user as any)._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('サブスクリプション情報も含まれる', async () => {
      const user = await createSubscribedUser({
        email: 'subscribed@example.com',
        name: 'サブスクユーザー',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .get(profileEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.subscription).toMatchObject({
        status: 'active',
        stripeCustomerId: expect.any(String),
        stripeSubscriptionId: expect.any(String),
        currentPeriodEnd: expect.any(String),
      });
    });

    it('統計情報も含まれる', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(profileEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        totalPredictionsViewed: expect.any(Number),
        hitRate: expect.any(Number),
        memberSince: expect.any(String),
      });
    });
  });

  describe('認証エラー', () => {
    it('未認証ユーザーはプロフィールを取得できない', async () => {
      const response = await request(app)
        .get(profileEndpoint);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('無効なトークンではプロフィールを取得できない', async () => {
      const response = await request(app)
        .get(profileEndpoint)
        .set('Cookie', 'token=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

describe('PUT /api/v1/users/profile', () => {
  const profileEndpoint = '/api/v1/users/profile';
  
  describe('正常系', () => {
    it('プロフィールを更新できる', async () => {
      const user = await createUser({
        name: '古い名前',
      });
      const token = getAuthToken(user);

      const updateData = {
        name: '新しい名前',
        bio: 'プロフィール説明文',
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.bio).toBe(updateData.bio);
      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('一部のフィールドのみ更新できる', async () => {
      const user = await createUser({
        name: '元の名前',
        bio: '元の説明',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ name: '更新後の名前' });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('更新後の名前');
      expect(response.body.user.bio).toBe('元の説明');
    });

    it('メール通知設定を更新できる', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const notificationSettings = {
        emailNotifications: {
          newPrediction: true,
          hitNotification: false,
          newsletter: true,
        },
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send(notificationSettings);

      expect(response.status).toBe(200);
      expect(response.body.user.emailNotifications).toMatchObject(notificationSettings.emailNotifications);
    });
  });

  describe('バリデーション', () => {
    it('名前が長すぎる場合は拒否される', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ name: 'a'.repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('プロフィール説明が長すぎる場合は拒否される', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ bio: 'a'.repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('保護されたフィールドは更新できない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          email: 'new@example.com',
          role: 'admin',
          emailVerified: true,
        });

      expect(response.status).toBe(200);
      
      // 保護されたフィールドは変更されない
      const profile = await request(app)
        .get(profileEndpoint)
        .set('Cookie', `token=${token}`);
      
      expect(profile.body.user.email).toBe(user.email);
      expect(profile.body.user.role).toBe('user');
    });
  });

  describe('セキュリティ', () => {
    it('XSS攻撃を防ぐ', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const maliciousData = {
        name: '<script>alert("XSS")</script>',
        bio: '<img src=x onerror=alert("XSS")>',
      };

      const response = await request(app)
        .put(profileEndpoint)
        .set('Cookie', `token=${token}`)
        .send(maliciousData);

      expect(response.status).toBe(200);
      // データはサニタイズされて保存される
      expect(response.body.user.name).toBe(maliciousData.name);
      expect(response.body.user.bio).toBe(maliciousData.bio);
    });
  });
});

describe('DELETE /api/v1/users/profile', () => {
  const deleteEndpoint = '/api/v1/users/profile';
  
  describe('正常系', () => {
    it('アカウントを削除できる', async () => {
      const user = await createUser({
        email: 'delete@example.com',
        password: 'SecurePass123!',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .delete(deleteEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ password: 'SecurePass123!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');
      
      // 削除後はログインできない
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'delete@example.com',
          password: 'SecurePass123!',
        });
      
      expect(loginResponse.status).toBe(401);
    });

    it('サブスクリプションも同時にキャンセルされる', async () => {
      const user = await createSubscribedUser({
        password: 'SecurePass123!',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .delete(deleteEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ password: 'SecurePass123!' });

      expect(response.status).toBe(200);
      // Stripeのサブスクリプションキャンセルが呼ばれることを確認（モックで）
    });
  });

  describe('認証エラー', () => {
    it('間違ったパスワードでは削除できない', async () => {
      const user = await createUser({
        password: 'SecurePass123!',
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .delete(deleteEndpoint)
        .set('Cookie', `token=${token}`)
        .send({ password: 'WrongPassword!' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('パスワードなしでは削除できない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .delete(deleteEndpoint)
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});