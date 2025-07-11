import request from 'supertest';
import app from '../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from './helpers/db';
import { User } from '../src/models/User';
import { Admin } from '../src/models/Admin';

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
      await Admin.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        name: '管理者',
        role: 'admin',
        isActive: true,
        permissions: ['users:read', 'users:write'],
      });

      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('admin');
    });

    it('管理者はユーザー一覧を取得できる', async () => {
      await Admin.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        name: '管理者',
        role: 'admin',
        isActive: true,
        permissions: ['users:read', 'users:write'],
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
        .set('Cookie', `adminToken=${token}`);

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

      const userToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', `token=${userToken}`);

      expect(response.status).toBe(401); // 管理者トークンがないため401
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

      // Cookieを取得
      const cookies = loginResponse.headers['set-cookie'];
      if (!cookies || cookies.length === 0) {
        throw new Error('No cookies received from login response');
      }
      
      const response = await request(app)
        .get('/api/v1/predictions/latest')
        .set('Cookie', cookies[0]);

      expect(response.status).toBe(200);
    });

    it('未認証ユーザーは予想を取得できない', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/latest');

      expect(response.status).toBe(401);
    });
  });
});