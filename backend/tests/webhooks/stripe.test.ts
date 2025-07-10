import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { createUser } from '../factories/user.factory';
import { User } from '../../src/models/User';
import Stripe from 'stripe';

// Stripeのモック
jest.mock('stripe');

const mockStripe = {
  webhooks: {
    constructEvent: jest.fn(),
  },
  checkout: {
    sessions: {
      retrieve: jest.fn(),
    },
  },
  subscriptions: {
    retrieve: jest.fn(),
  },
  customers: {
    retrieve: jest.fn(),
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

describe('POST /api/v1/payments/webhook', () => {
  const webhookEndpoint = '/api/v1/payments/webhook';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

  // Stripeの署名を生成するヘルパー関数
  function generateStripeSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  describe('署名検証', () => {
    it('有効な署名でWebhookを処理できる', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
          },
        },
      });

      const signature = generateStripeSignature(payload, webhookSecret);

      mockStripe.webhooks.constructEvent.mockReturnValue(JSON.parse(payload));

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        signature,
        webhookSecret
      );
    });

    it('無効な署名はエラーを返す', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      });

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', 'invalid_signature')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Webhook signature verification failed');
    });

    it('署名ヘッダーがない場合はエラーを返す', async () => {
      const response = await request(app)
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Webhook signature verification failed');
    });
  });

  describe('checkout.session.completed イベント', () => {
    it('新規サブスクリプション登録を処理する', async () => {
      const user = await createUser({
        email: 'subscriber@example.com',
      });

      const checkoutSession = {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          userId: user._id.toString(),
          planId: 'basic',
          billingPeriod: 'monthly',
        },
      };

      const subscription = {
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
      };

      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: checkoutSession,
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(checkoutSession);
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // ユーザーのサブスクリプション情報が更新されていることを確認
      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.subscription).toMatchObject({
        status: 'active',
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
      });
    });

    it('metadata.userIdがない場合はエラーログを出すが200を返す', async () => {
      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {}, // userIdなし
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('customer.subscription.updated イベント', () => {
    it('サブスクリプション更新を処理する', async () => {
      await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test_123',
          stripeSubscriptionId: 'sub_test_123',
          currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
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
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // サブスクリプション情報が更新されていることを確認
      const updatedUser = await User.findOne({ 'subscription.stripeSubscriptionId': 'sub_test_123' });
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.subscription!.status).toBe('active');
    });

    it('該当ユーザーが見つからない場合はエラーログを出すが200を返す', async () => {
      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_not_exist',
            customer: 'cus_not_exist',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('customer.subscription.deleted イベント', () => {
    it('サブスクリプションキャンセルを処理する', async () => {
      const user = await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test_123',
          stripeSubscriptionId: 'sub_test_123',
          currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // サブスクリプションがキャンセルされていることを確認
      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.subscription!.status).toBe('inactive');
    });
  });

  describe('invoice.payment_failed イベント', () => {
    it('支払い失敗を処理する', async () => {
      await createUser({
        subscription: {
          status: 'active',
          stripeCustomerId: 'cus_test_123',
          stripeSubscriptionId: 'sub_test_123',
          currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            billing_reason: 'subscription_cycle',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // サブスクリプションが支払い失敗状態になっていることを確認
      const updatedUser = await User.findOne({ 'subscription.stripeCustomerId': 'cus_test_123' });
      expect(updatedUser!.subscription!.status).toBe('past_due');
    });
  });

  describe('未対応のイベントタイプ', () => {
    it('未対応のイベントタイプは無視される', async () => {
      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'charge.succeeded', // 未対応のイベントタイプ
        data: {
          object: {
            id: 'ch_test_123',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('エラーハンドリング', () => {
    it('イベント処理中のエラーは500を返す', async () => {
      const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      // checkoutセッションの取得でエラーを発生させる
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(new Error('Stripe API Error'));

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('WEBHOOK_ERROR');
    });
  });

  describe('冪等性', () => {
    it('同じイベントIDを複数回受信しても正常に処理される', async () => {
      const user = await createUser({
        email: 'idempotent@example.com',
      });

      const event = {
        id: 'evt_test_duplicate',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              userId: user._id.toString(),
              planId: 'basic',
              billingPeriod: 'monthly',
            },
          },
        },
      };

      const subscription = {
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
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(event.data.object);
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      // 1回目のリクエスト
      const response1 = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response1.status).toBe(200);

      // 2回目のリクエスト（同じイベント）
      const response2 = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response2.status).toBe(200);

      // ユーザーのサブスクリプション情報が重複して更新されていないことを確認
      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.subscription!.stripeSubscriptionId).toBe('sub_test_123');
    });
  });
});