import request from 'supertest';
import app from '../src/app';

describe('POST /api/v1/auth/register', () => {
  it('新規ユーザーを登録できる', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
    expect(response.body.emailSent).toBe(true);
  });

  it('無効なメールアドレスは拒否される', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123!'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});