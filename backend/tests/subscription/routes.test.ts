import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser, createSubscribedUser } from '../factories/user.factory';
import { getAuthToken } from '../helpers/auth';
import Stripe from 'stripe';

// Stripeのモック
jest.mock('stripe');

const mockStripe = {
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
      cancel_at_period_end: true,
      cancel_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
  },
};

beforeAll(async () => {
  await connectTestDB();
  // Stripeモックの設定
  (Stripe as any).mockImplementation(() => mockStripe);
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

describe('Subscription Routes', () => {
  describe('POST /api/v1/subscribe/checkout', () => {
    const checkoutEndpoint = '/api/v1/subscribe/checkout';

    it('認証されたユーザーはチェックアウトセッションを作成できる', async () => {
      const user = await createUser({
        email: 'subscriber@example.com',
        emailVerified: true,
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('checkout.stripe.com');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'subscriber@example.com',
          metadata: {
            userId: (user as any)._id.toString(),
          },
        })
      );
    });

    it('メール未確認のユーザーはチェックアウトできない', async () => {
      const user = await createUser({
        email: 'unverified@example.com',
        emailVerified: false,
      });
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('既にサブスクリプションがあるユーザーはエラー', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(checkoutEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          priceId: 'price_test_123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ALREADY_SUBSCRIBED');
    });

    it('未認証ユーザーはアクセスできない', async () => {
      const response = await request(app)
        .post(checkoutEndpoint)
        .send({
          priceId: 'price_test_123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/subscribe/portal', () => {
    const portalEndpoint = '/api/v1/subscribe/portal';

    it('サブスクリプションがあるユーザーはポータルにアクセスできる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(portalEndpoint)
        .set('Cookie', `token=${token}`)
        .send({
          returnUrl: 'https://example.com/account',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('billing.stripe.com');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test',
        return_url: 'https://example.com/account',
      });
    });

    it('サブスクリプションがないユーザーはアクセスできない', async () => {
      const user = await createUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(portalEndpoint)
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
    });
  });

  describe('POST /api/v1/subscribe/cancel', () => {
    const cancelEndpoint = '/api/v1/subscribe/cancel';

    it('サブスクリプションをキャンセルできる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post(cancelEndpoint)
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Subscription cancelled successfully');
      expect(response.body.cancelAt).toBeDefined();
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test', {
        cancel_at_period_end: true,
      });
    });

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
          stripeCustomerId: 'cus_test',
          stripeSubscriptionId: 'sub_test',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  describe('GET /api/v1/users/subscription', () => {
    const subscriptionEndpoint = '/api/v1/users/subscription';

    it('サブスクリプション情報を取得できる', async () => {
      const user = await createSubscribedUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get(subscriptionEndpoint)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toMatchObject({
        status: 'active',
        stripeSubscriptionId: 'sub_test',
        isActive: true,
        daysRemaining: expect.any(Number),
      });
    });

    it('サブスクリプションがない場合は空の情報を返す', async () => {
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

    it('期限切れのサブスクリプションは非アクティブとして表示', async () => {
      const user = await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test',
          stripeSubscriptionId: 'sub_test',
          currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前に期限切れ
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

    it('未認証ユーザーはアクセスできない', async () => {
      const response = await request(app)
        .get(subscriptionEndpoint);

      expect(response.status).toBe(401);
    });
  });
});