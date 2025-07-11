import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { User } from '../../src/models/User';
import { Prediction } from '../../src/models/Prediction';
import { PredictionResult } from '../../src/models/PredictionResult';
import { DrawResult } from '../../src/models/DrawResult';
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

describe('Prediction History API', () => {
  let authCookie: string;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      emailVerified: true,
      subscription: {
        status: 'active',
        planId: 'monthly-basic',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 認証トークンを作成
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    authCookie = `token=${token}`;

    // テスト用の予想データを作成
    const predictions = await Prediction.create([
      {
        drawNumber: 1234,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678', '9012'],
        aiPredictions: ['2345', '6789', '0123'],
        viewCount: 10,
      },
      {
        drawNumber: 1233,
        drawDate: new Date('2024-01-08'),
        dataLogicPredictions: ['1111', '2222', '3333'],
        aiPredictions: [],
        viewCount: 5,
      },
      {
        drawNumber: 1232,
        drawDate: new Date('2024-01-01'),
        dataLogicPredictions: [],
        aiPredictions: ['4444', '5555', '6666'],
        viewCount: 3,
      },
    ]);

    // 抽選結果を作成
    const drawResults = await DrawResult.create([
      {
        drawNumber: 1234,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: {
          amount: 70000,
          winners: 1,
        },
      },
      {
        drawNumber: 1233,
        drawDate: new Date('2024-01-08'),
        winningNumber: '7777',
        prize: {
          amount: 70000,
          winners: 1,
        },
      },
      {
        drawNumber: 1232,
        drawDate: new Date('2024-01-01'),
        winningNumber: '4444',
        prize: {
          amount: 70000,
          winners: 1,
        },
      },
    ]);

    // ユーザーの予想結果を作成
    await PredictionResult.create([
      {
        userId: user._id,
        predictionId: predictions[0]!._id,
        drawResultId: drawResults[0]!._id,
        hits: {
          dataLogic: ['1234'],
          ai: [],
        },
        prizeWon: 70000,
      },
      {
        userId: user._id,
        predictionId: predictions[1]!._id,
        drawResultId: drawResults[1]!._id,
        hits: {
          dataLogic: [],
          ai: [],
        },
        prizeWon: 0,
      },
      {
        userId: user._id,
        predictionId: predictions[2]!._id,
        drawResultId: drawResults[2]!._id,
        hits: {
          dataLogic: [],
          ai: ['4444'],
        },
        prizeWon: 70000,
      },
    ]);
  });

  describe('GET /api/v1/predictions/history', () => {
    it('認証済みユーザーの予想履歴を取得できる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(3);
      expect(response.body.pagination?.pages || response.body.totalPages).toBe(1);
      expect(response.body.pagination?.page || response.body.currentPage).toBe(1);
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history?page=1&limit=2')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(2);
      expect(response.body.pagination?.pages || response.body.totalPages).toBe(2);
      expect(response.body.pagination?.page || response.body.currentPage).toBe(1);
    });

    it('データロジックのみでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history?type=dataLogic')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(1);
      expect(response.body.predictions[0].drawNumber).toBe(1233);
    });

    it('AIのみでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history?type=ai')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(1);
      expect(response.body.predictions[0].drawNumber).toBe(1233);
    });

    it('当選のみでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history?winOnly=true')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(2);
      expect(response.body.predictions.every((p: any) => p.result.isWin)).toBe(true);
    });

    it('複数のフィルターを組み合わせられる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history?type=ai&winOnly=true')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toHaveLength(1);
      expect(response.body.predictions[0].drawNumber).toBe(1233);
      expect(response.body.predictions[0].result.isWin).toBe(true);
    });

    it('予想の詳細情報が含まれる', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      const prediction = response.body.predictions[0];
      expect(prediction).toHaveProperty('_id');
      expect(prediction).toHaveProperty('drawNumber');
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions).toHaveProperty('dataLogic');
      expect(prediction.predictions).toHaveProperty('ai');
      expect(prediction).toHaveProperty('result');
      expect(prediction).toHaveProperty('createdAt');
      expect(prediction).toHaveProperty('analysis');
    });

    it('認証されていない場合は401エラーを返す', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/history');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('他のユーザーの予想履歴は取得できない', async () => {
      // 別のユーザーを作成
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'hashedpassword',
        emailVerified: true,
      });

      // 別のユーザーの予想を作成
      const otherPrediction = await Prediction.create({
        drawNumber: 1235,
        drawDate: new Date('2024-01-22'),
        dataLogicPredictions: ['9999'],
        aiPredictions: [],
        viewCount: 1,
      });

      // 別の抽選結果を作成
      const otherDrawResult = await DrawResult.create({
        drawNumber: 1235,
        drawDate: new Date('2024-01-22'),
        winningNumber: '8888',
        prize: {
          amount: 70000,
          winners: 1,
        },
      });

      await PredictionResult.create({
        userId: otherUser._id,
        predictionId: otherPrediction._id,
        drawResultId: otherDrawResult._id,
        hits: {
          dataLogic: [],
          ai: [],
        },
        prizeWon: 0,
      });

      const response = await request(app)
        .get('/api/v1/predictions/history')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.predictions.every((p: any) => p.drawNumber !== 1235)).toBe(true);
    });
  });
});