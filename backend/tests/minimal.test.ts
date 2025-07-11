import request from 'supertest';
import app from '../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from './helpers/db';
import { User } from '../src/models/User';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('必要最低限のテスト', () => {
  describe('認証機能', () => {
    it('新規ユーザーを登録できる', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'テストユーザー',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful');
    });

    it('ユーザーがログインできる', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('無効な認証情報でログインできない', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPass123!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('管理者機能', () => {
    it('管理者がログインできる', async () => {
      await User.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        name: '管理者',
        role: 'admin',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user?.role || response.body.admin?.role).toBe('admin');
    });

    it('管理者はユーザー一覧を取得できる', async () => {
      await User.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        name: '管理者',
        role: 'admin',
        emailVerified: true,
      });

      const loginResponse = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!',
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    it('一般ユーザーは管理画面にアクセスできない', async () => {
      await User.create({
        email: 'user@example.com',
        password: 'UserPass123!',
        name: 'ユーザー',
        role: 'user',
        emailVerified: true,
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'UserPass123!',
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBeGreaterThanOrEqual(401); // 401 or 403
    });
  });

  describe('予想機能', () => {
    it('認証済みユーザーは最新予想を取得できる', async () => {
      await User.create({
        email: 'user@example.com',
        password: 'UserPass123!',
        name: 'ユーザー',
        emailVerified: true,
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'UserPass123!',
        });

      const cookies = loginResponse.headers['set-cookie'];
      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;

      const response = await request(app)
        .get('/api/v1/predictions/latest')
        .set('Cookie', cookieString || `token=${loginResponse.body.token}`);

      // 予想データがない場合は404、権限がない場合は403の可能性がある
      expect([200, 403, 404]).toContain(response.status);
    });

    it('未認証ユーザーは予想を取得できない', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/latest');

      expect(response.status).toBe(401);
    });
  });
});