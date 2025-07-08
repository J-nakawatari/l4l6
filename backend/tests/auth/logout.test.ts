import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser } from '../factories/user.factory';
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

describe('POST /api/v1/auth/logout', () => {
  const logoutEndpoint = '/api/v1/auth/logout';
  
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createUser({
      email: 'test@example.com',
      emailVerified: true,
    });
    authToken = getAuthToken(testUser);
  });

  describe('正常系', () => {
    it('ログイン中のユーザーがログアウトできる', async () => {
      const response = await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
      
      // Cookieがクリアされているか確認
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=;');
      expect(cookies[0]).toContain('Max-Age=0');
    });

    it('ログアウト後は認証が必要なエンドポイントにアクセスできない', async () => {
      // ログアウト
      await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${authToken}`);

      // プロフィールアクセステスト
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Cookie', `token=${authToken}`);

      expect(profileResponse.status).toBe(401);
    });

    it('リフレッシュトークンも無効化される', async () => {
      // まずログインしてリフレッシュトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });

      const refreshToken = loginResponse.body.refreshToken;
      const token = loginResponse.headers['set-cookie'][0].split(';')[0].split('=')[1];

      // ログアウト
      await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${token}`);

      // リフレッシュトークンが使えないことを確認
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('認証エラー', () => {
    it('認証なしでログアウトはできない', async () => {
      const response = await request(app)
        .post(logoutEndpoint);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('No token provided');
    });

    it('無効なトークンでログアウトはできない', async () => {
      const response = await request(app)
        .post(logoutEndpoint)
        .set('Cookie', 'token=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid token');
    });

    it('期限切れトークンでログアウトはできない', async () => {
      // 期限切れトークンを生成（実装に応じて調整）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.invalid';

      const response = await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('複数デバイス対応', () => {
    it('一つのデバイスでログアウトしても他のデバイスには影響しない', async () => {
      // デバイス1でログイン
      const device1Login = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });
      const device1Token = device1Login.headers['set-cookie'][0].split(';')[0].split('=')[1];

      // デバイス2でログイン
      const device2Login = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePass123!',
        });
      const device2Token = device2Login.headers['set-cookie'][0].split(';')[0].split('=')[1];

      // デバイス1でログアウト
      await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${device1Token}`);

      // デバイス2は引き続きアクセス可能
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Cookie', `token=${device2Token}`);

      expect(profileResponse.status).toBe(200);
    });
  });

  describe('セキュリティ', () => {
    it('CSRF攻撃を防ぐ', async () => {
      // 異なるOriginからのリクエスト
      const response = await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${authToken}`)
        .set('Origin', 'http://malicious-site.com');

      // CORSまたはCSRF保護により拒否される
      expect([403, 401]).toContain(response.status);
    });

    it('ログアウトログが記録される', async () => {
      // ログ記録のモック（実装に応じて調整）
      const logSpy = jest.spyOn(console, 'log');

      await request(app)
        .post(logoutEndpoint)
        .set('Cookie', `token=${authToken}`);

      // ログが記録されていることを確認
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logout'),
        expect.objectContaining({
          userId: testUser._id.toString(),
        })
      );

      logSpy.mockRestore();
    });
  });
});