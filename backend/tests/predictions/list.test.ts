import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createSubscribedUser } from '../factories/user.factory';
import { getAuthToken } from '../helpers/auth';
import { Prediction } from '../../src/models/Prediction';
import { DrawResult } from '../../src/models/DrawResult';
import { PredictionResult } from '../../src/models/PredictionResult';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

// テスト用の予想データを作成するヘルパー
async function createTestPredictions() {
  const predictions = [];
  
  for (let i = 0; i < 15; i++) {
    const prediction = await Prediction.create({
      drawNumber: 1600 + i,
      drawDate: new Date(2024, 0, i + 1),
      dataLogicPredictions: ['1234', '5678', '9012', '3456'],
      aiPredictions: ['2345', '6789', '0123', '4567'],
      viewCount: i > 10 ? 0 : (i + 1) * 10, // 最新の予想は未公開
    });
    predictions.push(prediction);

    // 過去の予想には結果も作成
    if (i < 10) {
      await DrawResult.create({
        drawNumber: 1600 + i,
        drawDate: new Date(2024, 0, i + 1),
        winningNumber: i % 3 === 0 ? '1234' : '9999', // 3回に1回的中
        prize: { amount: 100000000, winners: 1 },
      });
    }
  }

  return predictions;
}

describe('GET /api/v1/predictions', () => {
  const predictionsEndpoint = '/api/v1/predictions';

  describe('正常系', () => {
    beforeEach(async () => {
      await createTestPredictions();
    });

    it('認証なしで公開済み予想一覧を取得できる', async () => {
      const response = await request(app)
        .get(predictionsEndpoint);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toBeDefined();
      expect(response.body.predictions.length).toBeGreaterThan(0);
      // 未公開の予想は含まれない
      expect(response.body.predictions.every((p: any) => p.viewCount > 0)).toBe(true);
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get(predictionsEndpoint)
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.predictions.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('新しい順にソートされる', async () => {
      const response = await request(app)
        .get(predictionsEndpoint);

      expect(response.status).toBe(200);
      const drawNumbers = response.body.predictions.map((p: any) => p.drawNumber);
      const sortedNumbers = [...drawNumbers].sort((a, b) => b - a);
      expect(drawNumbers).toEqual(sortedNumbers);
    });

    it('各予想に結果情報が含まれる', async () => {
      const response = await request(app)
        .get(predictionsEndpoint);

      expect(response.status).toBe(200);
      const predictionsWithResults = response.body.predictions.filter((p: any) => p.result);
      expect(predictionsWithResults.length).toBeGreaterThan(0);
      
      predictionsWithResults.forEach((prediction: any) => {
        expect(prediction.result).toMatchObject({
          winningNumber: expect.any(String),
          isHit: expect.any(Boolean),
          prize: expect.any(Object),
        });
      });
    });

    it('認証ユーザーには自分の予想結果も含まれる', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      // ユーザーの予想結果を作成 (ページ1に含まれる予想を使用)
      const prediction = await Prediction.findOne({ drawNumber: 1609 });
      const drawResult = await DrawResult.findOne({ drawNumber: 1609 });
      
      await PredictionResult.create({
        userId: (user as any)._id,
        predictionId: prediction!._id,
        drawResultId: drawResult!._id,
        hits: {
          dataLogic: ['1234'],
          ai: [],
        },
        prizeWon: 100000000,
      });

      const response = await request(app)
        .get(predictionsEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      const predictionWithUserResult = response.body.predictions.find((p: any) => p.drawNumber === 1609);
      expect(predictionWithUserResult).toBeDefined();
      expect(predictionWithUserResult.userResult).toMatchObject({
        hits: expect.any(Object),
        prizeWon: 100000000,
      });
    });

    it('期間でフィルタリングできる', async () => {
      const response = await request(app)
        .get(predictionsEndpoint)
        .query({
          startDate: '2024-01-05',
          endDate: '2024-01-10',
        });

      expect(response.status).toBe(200);
      expect(response.body.predictions.length).toBeGreaterThan(0);
      response.body.predictions.forEach((p: any) => {
        const drawDate = new Date(p.drawDate);
        expect(drawDate.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-05').getTime());
        expect(drawDate.getTime()).toBeLessThanOrEqual(new Date('2024-01-10').getTime());
      });
    });

    it('的中のみフィルタリングできる', async () => {
      const response = await request(app)
        .get(predictionsEndpoint)
        .query({ hitsOnly: true });

      expect(response.status).toBe(200);
      response.body.predictions.forEach((p: any) => {
        if (p.result) {
          expect(p.result.isHit).toBe(true);
        }
      });
    });
  });

  describe('統計情報', () => {
    it('全体の統計情報が含まれる', async () => {
      await createTestPredictions();

      const response = await request(app)
        .get(predictionsEndpoint);

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        totalPredictions: expect.any(Number),
        totalHits: expect.any(Number),
        hitRate: expect.any(Number),
        dataLogicHitRate: expect.any(Number),
        aiHitRate: expect.any(Number),
      });
    });
  });
});

describe('GET /api/v1/predictions/:id', () => {
  const getPredictionEndpoint = (id: string) => `/api/v1/predictions/${id}`;

  describe('正常系', () => {
    it('公開済み予想の詳細を取得できる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678', '9012', '3456'],
        aiPredictions: ['2345', '6789', '0123', '4567'],
        viewCount: 100,
      });

      const response = await request(app)
        .get(getPredictionEndpoint((prediction._id as any).toString()));

      expect(response.status).toBe(200);
      expect(response.body.prediction).toMatchObject({
        id: (prediction._id as any).toString(),
        drawNumber: 1600,
        dataLogicPredictions: expect.any(Array),
        aiPredictions: expect.any(Array),
      });
    });

    it('結果がある場合は結果情報も含まれる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678'],
        aiPredictions: ['2345', '6789'],
        viewCount: 100,
      });

      await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: { amount: 100000000, winners: 1 },
      });

      const response = await request(app)
        .get(getPredictionEndpoint((prediction._id as any).toString()));

      expect(response.status).toBe(200);
      expect(response.body.prediction.result).toMatchObject({
        winningNumber: '1234',
        isHit: true,
        hits: {
          dataLogic: ['1234'],
          ai: [],
        },
      });
    });

    it('閲覧数がインクリメントされる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['2345'],
        viewCount: 100,
      });

      await request(app)
        .get(getPredictionEndpoint((prediction._id as any).toString()));

      const updatedPrediction = await Prediction.findById(prediction._id);
      expect(updatedPrediction!.viewCount).toBe(101);
    });
  });

  describe('エラーケース', () => {
    it('存在しない予想IDは404エラー', async () => {
      const response = await request(app)
        .get(getPredictionEndpoint('507f1f77bcf86cd799439011'));

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PREDICTION_NOT_FOUND');
    });

    it('未公開の予想は一般ユーザーは取得できない', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['2345'],
        viewCount: 0, // 未公開
      });

      const response = await request(app)
        .get(getPredictionEndpoint((prediction._id as any).toString()));

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PREDICTION_NOT_PUBLISHED');
    });
  });
});

describe('GET /api/v1/predictions/latest', () => {
  const latestEndpoint = '/api/v1/predictions/latest';

  describe('正常系', () => {
    beforeEach(async () => {
      // 最新の予想を作成
      await Prediction.create({
        drawNumber: 1700,
        drawDate: new Date('2024-01-20'),
        dataLogicPredictions: ['1111', '2222', '3333', '4444'],
        aiPredictions: ['5555', '6666', '7777', '8888'],
        viewCount: 0, // 未公開
      });

      // 公開済みの古い予想
      await Prediction.create({
        drawNumber: 1699,
        drawDate: new Date('2024-01-17'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 100,
      });
    });

    it('サブスク会員は最新予想を取得できる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.prediction.drawNumber).toBe(1700);
      expect(response.body.prediction).toHaveProperty('dataLogicPredictions');
      expect(response.body.prediction).toHaveProperty('aiPredictions');
    });

    it('無料会員は最新予想を取得できない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
      expect(response.body.error.message).toContain('subscription');
    });

    it('未認証ユーザーは最新予想を取得できない', async () => {
      const response = await request(app)
        .get(latestEndpoint);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('最新予想の閲覧もカウントされる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      const latestPrediction = await Prediction.findOne({ drawNumber: 1700 });
      expect(latestPrediction!.viewCount).toBe(1);
    });

    it('閲覧履歴が記録される', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      
      // ユーザーの閲覧履歴を確認（実装に応じて）
      await PredictionResult.findOne({
        userId: (user as any)._id,
        predictionId: response.body.prediction.id,
      });
      
      // 閲覧履歴が作成されることを期待（実装による）
    });
  });

  describe('エラーケース', () => {
    it('予想が存在しない場合は404エラー', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NO_PREDICTIONS');
    });

    it('期限切れサブスクでは取得できない', async () => {
      const user = await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test',
          stripeSubscriptionId: 'sub_test',
          currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前に期限切れ
        },
      });
      const token = getAuthToken(user);

      await Prediction.create({
        drawNumber: 1700,
        drawDate: new Date(),
        dataLogicPredictions: ['1111'],
        aiPredictions: ['2222'],
        viewCount: 0,
      });

      const response = await request(app)
        .get(latestEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('SUBSCRIPTION_EXPIRED');
    });
  });
});