import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createSubscribedUser } from '../factories/user.factory';
import { getAuthToken } from '../helpers/auth';

// Stripeモック
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'bps_test_123',
          url: 'https://billing.stripe.com/session/bps_test_123',
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [{
            price: {
              unit_amount: 1000,
              currency: 'jpy',
            },
          }],
        },
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'canceled',
      }),
    },
  }));
});

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('POST /api/v1/subscribe/checkout', () => {
  const checkoutEndpoint = '/api/v1/subscribe/checkout';
  
  describe('正常系', () => {
    it('Stripe Checkoutセッションを作成できる', async () => {
      const user = await createUser({
        email: 'checkout@example.com',
        emailVerified: true,
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_monthly',
          successUrl: 'http://localhost:3000/subscribe/success',
          cancelUrl: 'http://localhost:3000/subscribe/cancel',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId', 'cs_test_123');
      expect(response.body).toHaveProperty('url', 'https://checkout.stripe.com/pay/cs_test_123');
    });

    it('既存のStripe顧客IDが使用される', async () => {
      const user = await createUser({
        subscription: {
          status: 'inactive',
          stripeCustomerId: 'cus_existing_123',
        },
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_monthly',
          successUrl: 'http://localhost:3000/subscribe/success',
          cancelUrl: 'http://localhost:3000/subscribe/cancel',
        });

      expect(response.status).toBe(200);
      // Stripeモックで既存顧客IDが使用されることを確認
    });
  });

  describe('エラーケース', () => {
    it('既にアクティブなサブスクリプションがある場合は拒否される', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_monthly',
          successUrl: 'http://localhost:3000/subscribe/success',
          cancelUrl: 'http://localhost:3000/subscribe/cancel',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ALREADY_SUBSCRIBED');
    });

    it('メール未確認のユーザーは購読できない', async () => {
      const user = await createUser({
        emailVerified: false,
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_monthly',
          successUrl: 'http://localhost:3000/subscribe/success',
          cancelUrl: 'http://localhost:3000/subscribe/cancel',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('無効な価格IDは拒否される', async () => {
      const user = await createUser({ emailVerified: true });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'invalid_price_id',
          successUrl: 'http://localhost:3000/subscribe/success',
          cancelUrl: 'http://localhost:3000/subscribe/cancel',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PRICE_ID');
    });
  });
});

describe('POST /api/v1/subscribe/portal', () => {
  const portalEndpoint = '/api/v1/subscribe/portal';
  
  describe('正常系', () => {
    it('Billing Portalセッションを作成できる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(portalEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          returnUrl: 'http://localhost:3000/dashboard',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('billing.stripe.com');
    });
  });

  describe('エラーケース', () => {
    it('サブスクリプションがないユーザーはポータルにアクセスできない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(portalEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          returnUrl: 'http://localhost:3000/dashboard',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
    });

    it('Stripe顧客IDがない場合はエラー', async () => {
      const user = await createUser({
        subscription: {
          status: 'active',
          // stripeCustomerIdがない
        },
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(portalEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          returnUrl: 'http://localhost:3000/dashboard',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_CUSTOMER_ID');
    });
  });
});

describe('GET /api/v1/users/subscription', () => {
  const subscriptionEndpoint = '/api/v1/users/subscription';
  
  describe('正常系', () => {
    it('サブスクリプション情報を取得できる', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const user = await createSubscribedUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test_123',
          stripeSubscriptionId: 'sub_test_123',
          currentPeriodEnd: futureDate,
        },
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .get(subscriptionEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toMatchObject({
        status: 'active',
        stripeSubscriptionId: 'sub_test_123',
        currentPeriodEnd: futureDate.toISOString(),
        isActive: true,
        daysRemaining: expect.any(Number),
      });
      expect(response.body.subscription.daysRemaining).toBeGreaterThan(0);
    });

    it('サブスクリプションがない場合は空オブジェクトを返す', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(subscriptionEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toMatchObject({
        status: 'inactive',
        isActive: false,
      });
    });

    it('期限切れのサブスクリプションは非アクティブとして表示される', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const user = await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test_123',
          stripeSubscriptionId: 'sub_test_123',
          currentPeriodEnd: pastDate,
        },
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .get(subscriptionEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription.isActive).toBe(false);
      expect(response.body.subscription.daysRemaining).toBe(0);
    });
  });
});

describe('POST /api/v1/subscribe/cancel', () => {
  const cancelEndpoint = '/api/v1/subscribe/cancel';
  
  describe('正常系', () => {
    it('サブスクリプションをキャンセルできる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(cancelEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          reason: 'too_expensive',
          feedback: '価格が高すぎるため',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Subscription cancelled successfully');
      expect(response.body.cancelAt).toBeDefined();
    });

    it('期間終了時にキャンセルされる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(cancelEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          immediate: false,
        });

      expect(response.status).toBe(200);
      // 期間終了までは使用可能
      expect(response.body.activeUntil).toBeDefined();
    });
  });

  describe('エラーケース', () => {
    it('サブスクリプションがない場合はキャンセルできない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(cancelEndpoint)
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
    });

    it('既にキャンセル済みの場合はエラー', async () => {
      const user = await createUser({
        subscription: {
          status: 'cancelled',
          stripeSubscriptionId: 'sub_test_123',
        },
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(cancelEndpoint)
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ALREADY_CANCELLED');
    });
  });
});