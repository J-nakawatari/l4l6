import { Router, Request, Response } from 'express';

const router = Router();

// 環境変数確認用エンドポイント（本番環境でも有効）
router.get('/env-check', (_req: Request, res: Response): void => {
  res.json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    },
    stripe: {
      secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'なし',
      secretKeyType: process.env.STRIPE_SECRET_KEY ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST') : 'なし',
      webhookSecretExists: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) + '...' : 'なし'
    },
    database: {
      mongoUriExists: !!process.env.MONGODB_URI,
      mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'なし'
    },
    frontend: {
      frontendUrl: process.env.FRONTEND_URL
    },
    jwt: {
      jwtSecretExists: !!process.env.JWT_SECRET
    },
    timestamp: new Date().toISOString()
  });
});

// Stripe接続テスト（本番環境でも有効）
router.get('/stripe-test', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Stripeライブラリをインポート
    const Stripe = require('stripe');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      res.json({
        success: false,
        error: 'STRIPE_SECRET_KEY が設定されていません',
        environment: process.env.NODE_ENV
      });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });

    // Stripeアカウント情報を取得してテスト
    const account = await stripe.accounts.retrieve();
    
    res.json({
      success: true,
      environment: process.env.NODE_ENV,
      stripe: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
        isLive: !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'),
        keyPrefix: process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...'
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      environment: process.env.NODE_ENV,
      error: error.message,
      code: error.code || 'unknown',
      keyExists: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'なし'
    });
  }
});

// チェックアウトセッション作成の詳細デバッグ
router.post('/checkout-debug', async (req: Request, res: Response): Promise<void> => {
  try {
    const Stripe = require('stripe');
    
    console.log('🚀 チェックアウトデバッグ開始');
    console.log('環境:', process.env.NODE_ENV);
    console.log('リクエストボディ:', req.body);
    
    if (!process.env.STRIPE_SECRET_KEY) {
      res.json({
        success: false,
        error: 'STRIPE_SECRET_KEY が設定されていません'
      });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });

    // 簡単なテスト用チェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'テスト商品',
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://l4l6.com/success',
      cancel_url: 'https://l4l6.com/cancel',
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ チェックアウトエラー:', error);
    res.json({
      success: false,
      error: error.message,
      code: error.code,
      type: error.type
    });
  }
});

export default router;