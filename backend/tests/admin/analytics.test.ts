import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createAdmin, createSubscribedUser } from '../factories/user.factory';
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

describe('GET /api/v1/admin/analytics', () => {
  const analyticsEndpoint = '/api/v1/admin/analytics';
  
  describe('正常系', () => {
    it('管理者は総合統計を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // テストデータ作成
      await createUser();
      await createUser();
      await createSubscribedUser();

      const response = await request(app)
        .get(analyticsEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        overview: {
          totalUsers: 4, // 管理者含む
          activeUsers: expect.any(Number),
          subscribedUsers: 1,
          totalRevenue: expect.any(Number),
          monthlyRevenue: expect.any(Number),
        },
        growth: {
          newUsersToday: expect.any(Number),
          newUsersThisMonth: expect.any(Number),
          churnRate: expect.any(Number),
          growthRate: expect.any(Number),
        },
      });
    });

    it('期間指定で統計を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(analyticsEndpoint)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toMatchObject({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('予想に関する統計も含まれる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // 予想データを作成
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date(),
        dataLogicPredictions: ['1234', '5678'],
        aiPredictions: ['2345', '6789'],
        viewCount: 100,
      });

      const drawResult = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date(),
        winningNumber: '1234',
        prize: { amount: 100000000, winners: 1 },
      });

      const response = await request(app)
        .get(analyticsEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.predictions).toMatchObject({
        totalPredictions: 1,
        totalViews: 100,
        hitRate: expect.any(Number),
        dataLogicHitRate: expect.any(Number),
        aiHitRate: expect.any(Number),
      });
    });
  });

  describe('権限エラー', () => {
    it('一般ユーザーは統計を取得できない', async () => {
      const user = await createUser();
      const userToken = getAuthToken(user);

      const response = await request(app)
        .get(analyticsEndpoint)
        .set('Cookie', `token=${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});

describe('GET /api/v1/admin/analytics/revenue', () => {
  const revenueEndpoint = '/api/v1/admin/analytics/revenue';
  
  describe('正常系', () => {
    it('収益詳細を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // サブスクユーザーを作成
      for (let i = 0; i < 5; i++) {
        await createSubscribedUser();
      }

      const response = await request(app)
        .get(revenueEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        current: {
          monthly: expect.any(Number),
          yearly: expect.any(Number),
          total: expect.any(Number),
        },
        mrr: expect.any(Number), // Monthly Recurring Revenue
        arr: expect.any(Number), // Annual Recurring Revenue
        arpu: expect.any(Number), // Average Revenue Per User
        ltv: expect.any(Number), // Lifetime Value
      });
    });

    it('月別収益推移を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(revenueEndpoint)
        .query({ view: 'monthly', months: 12 })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.monthlyRevenue).toBeDefined();
      expect(Array.isArray(response.body.monthlyRevenue)).toBe(true);
      expect(response.body.monthlyRevenue[0]).toMatchObject({
        month: expect.any(String),
        revenue: expect.any(Number),
        subscriptions: expect.any(Number),
        churn: expect.any(Number),
      });
    });

    it('プラン別の収益内訳を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(revenueEndpoint)
        .query({ view: 'by-plan' })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.planBreakdown).toBeDefined();
      expect(response.body.planBreakdown).toMatchObject({
        monthly: {
          subscribers: expect.any(Number),
          revenue: expect.any(Number),
          percentage: expect.any(Number),
        },
        yearly: {
          subscribers: expect.any(Number),
          revenue: expect.any(Number),
          percentage: expect.any(Number),
        },
      });
    });
  });
});

describe('GET /api/v1/admin/analytics/users', () => {
  const usersAnalyticsEndpoint = '/api/v1/admin/analytics/users';
  
  describe('正常系', () => {
    it('ユーザー分析データを取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(usersAnalyticsEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        demographics: {
          total: expect.any(Number),
          verified: expect.any(Number),
          unverified: expect.any(Number),
        },
        activity: {
          dau: expect.any(Number), // Daily Active Users
          wau: expect.any(Number), // Weekly Active Users
          mau: expect.any(Number), // Monthly Active Users
        },
        retention: {
          day1: expect.any(Number),
          day7: expect.any(Number),
          day30: expect.any(Number),
        },
      });
    });

    it('コホート分析データを取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(usersAnalyticsEndpoint)
        .query({ analysis: 'cohort', months: 6 })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.cohortAnalysis).toBeDefined();
      expect(Array.isArray(response.body.cohortAnalysis)).toBe(true);
    });
  });
});

describe('GET /api/v1/admin/analytics/predictions', () => {
  const predictionsAnalyticsEndpoint = '/api/v1/admin/analytics/predictions';
  
  describe('正常系', () => {
    it('予想分析データを取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      // テストデータ作成
      for (let i = 1; i <= 10; i++) {
        const prediction = await Prediction.create({
          drawNumber: 1600 + i,
          drawDate: new Date(2024, 0, i),
          dataLogicPredictions: ['1234', '5678'],
          aiPredictions: ['2345', '6789'],
          viewCount: Math.floor(Math.random() * 1000),
        });

        const drawResult = await DrawResult.create({
          drawNumber: 1600 + i,
          drawDate: new Date(2024, 0, i),
          winningNumber: i % 2 === 0 ? '1234' : '9999', // 50%的中率
          prize: { amount: 100000000, winners: 1 },
        });
      }

      const response = await request(app)
        .get(predictionsAnalyticsEndpoint)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        performance: {
          totalPredictions: 10,
          totalHits: expect.any(Number),
          overallHitRate: expect.any(Number),
          dataLogicHitRate: expect.any(Number),
          aiHitRate: expect.any(Number),
        },
        popularity: {
          totalViews: expect.any(Number),
          averageViewsPerPrediction: expect.any(Number),
          mostViewedPredictions: expect.any(Array),
        },
        trends: {
          hitRateByMonth: expect.any(Array),
          viewsByMonth: expect.any(Array),
        },
      });
    });

    it('数字の出現頻度分析を取得できる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .get(predictionsAnalyticsEndpoint)
        .query({ analysis: 'frequency' })
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.frequencyAnalysis).toBeDefined();
      expect(response.body.frequencyAnalysis).toMatchObject({
        byPosition: expect.any(Array), // 各桁の頻度
        mostFrequent: expect.any(Array), // 最頻出数字
        leastFrequent: expect.any(Array), // 最少出現数字
      });
    });
  });
});

describe('POST /api/v1/admin/analytics/export', () => {
  const exportEndpoint = '/api/v1/admin/analytics/export';
  
  describe('正常系', () => {
    it('統計データをCSV形式でエクスポートできる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .post(exportEndpoint)
        .set('Cookie', `token=${adminToken}`)
        .send({
          type: 'users',
          format: 'csv',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('複数の統計タイプをエクスポートできる', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .post(exportEndpoint)
        .set('Cookie', `token=${adminToken}`)
        .send({
          types: ['users', 'revenue', 'predictions'],
          format: 'xlsx',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
    });
  });

  describe('バリデーション', () => {
    it('無効な形式は拒否される', async () => {
      const admin = await createAdmin();
      const adminToken = getAuthToken(admin);

      const response = await request(app)
        .post(exportEndpoint)
        .set('Cookie', `token=${adminToken}`)
        .send({
          type: 'users',
          format: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });
  });
});