import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser } from '../factories/user.factory';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('POST /api/v1/auth/login', () => {
  const loginEndpoint = '/api/v1/auth/login';
  
  let testUser: any;
  const testPassword = 'SecurePass123!';

  beforeEach(async () => {
    testUser = await createUser({
      email: 'test@example.com',
      password: testPassword,
      name: 'テストユーザー',
      emailVerified: true,
    });
  });

  describe('正常系', () => {
    it('正しい認証情報でログインできる', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('password');
      
      // JWTトークンがCookieに設定されているか確認
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies).toBeDefined();
      expect(cookies![0]).toContain('token=');
      expect(cookies![0]).toContain('HttpOnly');
      expect(cookies![0]).toContain('SameSite=Lax');
    });

    it('リフレッシュトークンも返される', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).toBeTruthy();
    });

    it('メールアドレスは大文字小文字を区別しない', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email.toUpperCase(),
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('認証失敗', () => {
    it('間違ったパスワードでログインできない', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('存在しないメールアドレスでログインできない', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('メール未確認のユーザーはログインできない', async () => {
      const unverifiedUser = await createUser({
        email: 'unverified@example.com',
        password: testPassword,
        emailVerified: false,
      });

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: unverifiedUser.email,
          password: testPassword,
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
      expect(response.body.error.message).toContain('verify your email');
    });
  });

  describe('バリデーション', () => {
    it('メールアドレスが不足している場合は拒否される', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          password: testPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('パスワードが不足している場合は拒否される', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なメールフォーマットは拒否される', async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: 'invalid-email',
          password: testPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('レート制限', () => {
    it('ログイン失敗が続くとレート制限される', async () => {
      const attempts = Array(6).fill(null).map(() => 
        request(app)
          .post(loginEndpoint)
          .send({
            email: testUser.email,
            password: 'WrongPassword!',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited.length).toBeGreaterThan(0);
      if (rateLimited.length > 0) {
        expect(rateLimited[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('成功したログインはレート制限にカウントされない', async () => {
      // 5回成功
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post(loginEndpoint)
          .send({
            email: testUser.email,
            password: testPassword,
          });
        expect(response.status).toBe(200);
      }

      // 6回目も成功するはず
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: testUser.email,
          password: testPassword,
        });
      expect(response.status).toBe(200);
    });
  });

  describe('セキュリティ', () => {
    it('ブルートフォース攻撃を防ぐ', async () => {
      const passwords = [
        'password123',
        'admin123',
        '12345678',
        'qwerty123',
        'letmein123',
      ];

      const attempts = passwords.map(password =>
        request(app)
          .post(loginEndpoint)
          .send({
            email: testUser.email,
            password,
          })
      );

      const responses = await Promise.all(attempts);
      
      // すべて失敗またはレート制限
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });

    it('タイミング攻撃を防ぐ', async () => {
      const timings: number[] = [];

      // 存在するユーザー
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app)
          .post(loginEndpoint)
          .send({
            email: testUser.email,
            password: 'WrongPassword!',
          });
        timings.push(Date.now() - start);
      }

      // 存在しないユーザー
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app)
          .post(loginEndpoint)
          .send({
            email: 'nonexistent@example.com',
            password: 'WrongPassword!',
          });
        timings.push(Date.now() - start);
      }

      // タイミングの差が小さいことを確認（±50ms程度）
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTiming)));
      expect(maxDeviation).toBeLessThan(50);
    });
  });
});