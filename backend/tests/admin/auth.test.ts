import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createAdmin } from '../factories/user.factory';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('POST /api/v1/admin/auth/login', () => {
  const adminLoginEndpoint = '/api/v1/admin/auth/login';
  
  let testAdmin: any;
  const testPassword = 'AdminPass123!';

  beforeEach(async () => {
    testAdmin = await createAdmin({
      email: 'admin@example.com',
      password: testPassword,
      emailVerified: true,
    });
  });

  describe('正常系', () => {
    it('管理者は専用エンドポイントからログインできる', async () => {
      const response = await request(app)
        .post(adminLoginEndpoint)
        .send({
          email: testAdmin.email,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('admin');
      
      // 管理者用の追加権限情報
      expect(response.body).toHaveProperty('permissions');
      expect(response.body.permissions).toContain('users:read');
      expect(response.body.permissions).toContain('users:write');
      expect(response.body.permissions).toContain('analytics:read');
    });

    it('2要素認証が有効な場合は追加ステップが必要', async () => {
      // 2FAを有効化
      testAdmin.twoFactorEnabled = true;
      await testAdmin.save();

      const response = await request(app)
        .post(adminLoginEndpoint)
        .send({
          email: testAdmin.email,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requiresTwoFactor', true);
      expect(response.body).toHaveProperty('tempToken');
      expect(response.body).not.toHaveProperty('user');
    });

    it('IPアドレス制限がチェックされる', async () => {
      // 管理者に許可IPを設定
      testAdmin.allowedIPs = ['192.168.1.1'];
      await testAdmin.save();

      const response = await request(app)
        .post(adminLoginEndpoint)
        .set('X-Forwarded-For', '10.0.0.1') // 許可されていないIP
        .send({
          email: testAdmin.email,
          password: testPassword,
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('IP_NOT_ALLOWED');
    });
  });

  describe('認証失敗', () => {
    it('一般ユーザーは管理者ログインできない', async () => {
      const user = await createAdmin({
        email: 'user@example.com',
        password: testPassword,
        role: 'user', // 一般ユーザーに変更
      });

      const response = await request(app)
        .post(adminLoginEndpoint)
        .send({
          email: user.email,
          password: testPassword,
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('NOT_ADMIN');
    });

    it('管理者ログインは通常より厳しいレート制限がある', async () => {
      const attempts = Array(3).fill(null).map(() => 
        request(app)
          .post(adminLoginEndpoint)
          .send({
            email: testAdmin.email,
            password: 'WrongPassword!',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0]?.body.error.message).toContain('Too many login attempts');
    });
  });

  describe('セキュリティログ', () => {
    it('管理者ログイン試行はすべてログに記録される', async () => {
      const logSpy = jest.spyOn(console, 'log');

      await request(app)
        .post(adminLoginEndpoint)
        .send({
          email: testAdmin.email,
          password: testPassword,
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Admin login attempt'),
        expect.objectContaining({
          email: testAdmin.email,
          success: true,
          ip: expect.any(String),
        })
      );

      logSpy.mockRestore();
    });

    it('失敗した管理者ログインは警告レベルでログに記録される', async () => {
      const logSpy = jest.spyOn(console, 'warn');

      await request(app)
        .post(adminLoginEndpoint)
        .send({
          email: testAdmin.email,
          password: 'WrongPassword!',
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed admin login attempt'),
        expect.objectContaining({
          email: testAdmin.email,
          ip: expect.any(String),
        })
      );

      logSpy.mockRestore();
    });
  });
});

describe('POST /api/v1/admin/auth/verify-2fa', () => {
  const verify2FAEndpoint = '/api/v1/admin/auth/verify-2fa';
  
  it('正しい2FAコードで認証が完了する', async () => {
    // 2FAが必要なログインレスポンスを想定
    const tempToken = 'temp_token_123';
    const correctCode = '123456';

    const response = await request(app)
      .post(verify2FAEndpoint)
      .send({
        tempToken,
        code: correctCode,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('accessToken');
  });

  it('間違った2FAコードは拒否される', async () => {
    const tempToken = 'temp_token_123';

    const response = await request(app)
      .post(verify2FAEndpoint)
      .send({
        tempToken,
        code: '000000',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_2FA_CODE');
  });

  it('2FAコードは時間制限がある', async () => {
    const expiredTempToken = 'expired_token';

    const response = await request(app)
      .post(verify2FAEndpoint)
      .send({
        tempToken: expiredTempToken,
        code: '123456',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TEMP_TOKEN_EXPIRED');
  });
});

describe('POST /api/v1/admin/auth/logout', () => {
  const adminLogoutEndpoint = '/api/v1/admin/auth/logout';
  
  it('管理者セッションはすべてのデバイスから無効化される', async () => {
    await createAdmin();
    const token1 = 'admin_token_device1';
    const token2 = 'admin_token_device2';

    // デバイス1からログアウト
    const response = await request(app)
      .post(adminLogoutEndpoint)
      .set('Cookie', `token=${token1}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('All sessions terminated');

    // デバイス2のトークンも無効化されている
    const profileResponse = await request(app)
      .get('/api/v1/admin/users')
      .set('Cookie', `token=${token2}`);

    expect(profileResponse.status).toBe(401);
  });
});