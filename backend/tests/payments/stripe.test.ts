import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser } from '../factories/user.factory';
import { User } from '../../src/models/User';
import Stripe from 'stripe';

// Stripeモックをセットアップ
jest.mock('stripe');

// モックされたStripeインスタンス
const mockCheckoutSessionsCreate = jest.fn() as jest.MockedFunction<any>;
const mockWebhooksConstructEvent = jest.fn() as jest.MockedFunction<any>;

// Stripeモックを設定
const MockedStripe = Stripe as unknown as jest.Mock;
MockedStripe.mockImplementation(() => ({
  checkout: {
    sessions: {
      create: mockCheckoutSessionsCreate,
    },
  },
  webhooks: {
    constructEvent: mockWebhooksConstructEvent,
  },
}));

// Stripeの静的メソッドもモック
MockedStripe.prototype = {
  checkout: {
    sessions: {
      create: mockCheckoutSessionsCreate,
    },
  },
  webhooks: {
    constructEvent: mockWebhooksConstructEvent,
  },
};

beforeAll(async () => {
  // 環境変数を設定
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
  process.env.FRONTEND_URL = 'http://localhost:3002';
  
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

describe('Payment Routes', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    mockCheckoutSessionsCreate.mockClear();
    mockWebhooksConstructEvent.mockClear();
  });
  
  describe('POST /api/v1/payments/create-checkout-session', () => {
    const endpoint = '/api/v1/payments/create-checkout-session';
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // テストユーザーを作成
      testUser = await createUser({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'テストユーザー',
        emailVerified: true,
      });

      // ログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      // クッキーからトークンを取得
      const tokenCookie = loginResponse.headers['set-cookie']?.[0];
      if (tokenCookie && tokenCookie.includes('token=')) {
        authToken = tokenCookie;
      } else {
        throw new Error('Failed to get auth token');
      }
    });

    it('月額ベーシックプランのチェックアウトセッションを作成できる', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_basic_monthly',
        url: 'https://checkout.stripe.com/pay/cs_test_basic_monthly',
      });

      const response = await request(app)
        .post(endpoint)
        .set('Cookie', authToken)
        .send({
          planId: 'basic',
          billingPeriod: 'monthly',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      // ダミー環境ではStripeは呼ばれない
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('年額プレミアムプランのチェックアウトセッションを作成できる', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_premium_yearly',
        url: 'https://checkout.stripe.com/pay/cs_test_premium_yearly',
      });

      const response = await request(app)
        .post(endpoint)
        .set('Cookie', authToken)
        .send({
          planId: 'premium',
          billingPeriod: 'yearly',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      // ダミー環境ではStripeは呼ばれない
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('無効なプランIDの場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Cookie', authToken)
        .send({
          planId: 'invalid',
          billingPeriod: 'monthly',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid plan ID',
      });
    });

    it('無効な請求期間の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Cookie', authToken)
        .send({
          planId: 'basic',
          billingPeriod: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid billing period',
      });
    });

    it('認証されていない場合、401エラーを返す', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          planId: 'basic',
          billingPeriod: 'monthly',
        });

      expect(response.status).toBe(401);
    });

    it('Stripeエラーの場合、500エラーを返す', async () => {
      mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe error'));

      const response = await request(app)
        .post(endpoint)
        .set('Cookie', authToken)
        .send({
          planId: 'basic',
          billingPeriod: 'monthly',
        });

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to create checkout session',
      });
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    const endpoint = '/api/v1/payments/webhook';

    it('checkout.session.completedイベントを処理できる', async () => {
      const testEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer_email: 'test@example.com',
            metadata: {
              userId: '507f1f77bcf86cd799439011',
              planId: 'premium',
              billingPeriod: 'monthly',
            },
            subscription: 'sub_test_123',
          },
        },
      };

      mockWebhooksConstructEvent.mockReturnValue(testEvent);

      // テスト用ユーザーを作成
      await User.create({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        subscription: {
          status: 'inactive',
          plan: 'free',
        },
      });

      const response = await request(app)
        .post(endpoint)
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(testEvent)));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });

      // ユーザーのサブスクリプションが更新されたか確認
      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser?.subscription?.status).toBe('active');
      expect(updatedUser?.subscription?.plan).toBe('premium');
      expect(updatedUser?.subscription?.stripeSubscriptionId).toBe('sub_test_123');
    });

    it('customer.subscription.deletedイベントを処理できる', async () => {
      const testEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
          },
        },
      };

      mockWebhooksConstructEvent.mockReturnValue(testEvent);

      // アクティブなサブスクリプションを持つユーザーを作成
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        subscription: {
          status: 'active',
          plan: 'premium',
          stripeSubscriptionId: 'sub_test_123',
        },
      });

      const response = await request(app)
        .post(endpoint)
        .set('stripe-signature', 'test-signature')
        .send(Buffer.from(JSON.stringify(testEvent)));

      expect(response.status).toBe(200);

      // ユーザーのサブスクリプションがキャンセルされたか確認
      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser?.subscription?.status).toBe('inactive');
      expect(updatedUser?.subscription?.plan).toBe('free');
    });

    it('無効な署名の場合、400エラーを返す', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post(endpoint)
        .set('stripe-signature', 'invalid-signature')
        .send(Buffer.from('{}'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Webhook signature verification failed',
      });
    });
  });
});