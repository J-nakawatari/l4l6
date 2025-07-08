import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { User } from '../../src/models/User';
import { Prediction } from '../../src/models/Prediction';
import jwt from 'jsonwebtoken';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('GET /api/v1/predictions/latest', () => {
  let authCookie: string;
  let userWithoutSubscription: string;

  beforeEach(async () => {
    // 有料会員のユーザーを作成
    const paidUser = await User.create({
      name: 'Paid User',
      email: 'paid@example.com',
      password: 'hashedpassword',
      emailVerified: true,
      subscription: {
        status: 'active',
        planId: 'monthly-basic',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 無料会員のユーザーを作成
    const freeUser = await User.create({
      name: 'Free User',
      email: 'free@example.com',
      password: 'hashedpassword',
      emailVerified: true,
    });

    // 認証トークンを作成
    const paidToken = jwt.sign(
      { id: paidUser._id, email: paidUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    authCookie = `token=${paidToken}`;

    const freeToken = jwt.sign(
      { id: freeUser._id, email: freeUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    userWithoutSubscription = `token=${freeToken}`;

    // 最新の予想を作成
    await Prediction.create({
      drawNumber: 1236,
      drawDate: new Date('2024-01-29'),
      dataLogicPredictions: ['1234', '5678', '9012'],
      aiPredictions: ['2345', '6789', '0123'],
      viewCount: 0,
    });
  });

  it('有料会員は最新の予想を取得できる', async () => {
    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body.prediction).toBeDefined();
    expect(response.body.prediction.drawNumber).toBe(1236);
    expect(response.body.prediction.dataLogicPredictions).toHaveLength(3);
    expect(response.body.prediction.aiPredictions).toHaveLength(3);
    expect(response.body.prediction.viewCount).toBe(1); // インクリメントされている
  });

  it('認証されていない場合は401エラーを返す', async () => {
    const response = await request(app)
      .get('/api/v1/predictions/latest');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('無料会員の場合は403エラーを返す', async () => {
    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', userWithoutSubscription);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('サブスクリプションが期限切れの場合は403エラーを返す', async () => {
    // 期限切れのサブスクリプションを持つユーザーを作成
    const expiredUser = await User.create({
      name: 'Expired User',
      email: 'expired@example.com',
      password: 'hashedpassword',
      emailVerified: true,
      subscription: {
        status: 'active',
        planId: 'monthly-basic',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
      },
    });

    const expiredToken = jwt.sign(
      { id: expiredUser._id, email: expiredUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    const expiredCookie = `token=${expiredToken}`;

    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', expiredCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('予想が存在しない場合は404エラーを返す', async () => {
    // 既存の予想を削除
    await Prediction.deleteMany({});

    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', authCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NO_PREDICTIONS');
  });

  it('閲覧回数がインクリメントされる', async () => {
    // 初回リクエスト
    await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', authCookie);

    // 2回目のリクエスト
    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body.prediction.viewCount).toBe(2);
  });

  it('最新の予想が返される', async () => {
    // 古い予想を追加
    await Prediction.create({
      drawNumber: 1235,
      drawDate: new Date('2024-01-22'),
      dataLogicPredictions: ['1111', '2222', '3333'],
      aiPredictions: ['4444', '5555', '6666'],
      viewCount: 10,
    });

    const response = await request(app)
      .get('/api/v1/predictions/latest')
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body.prediction.drawNumber).toBe(1236); // 最新の予想
  });
});