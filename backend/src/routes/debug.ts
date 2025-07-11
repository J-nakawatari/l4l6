import { Router } from 'express';

const router = Router();

// 環境変数確認用エンドポイント（開発環境でのみ有効）
router.get('/env-check', (req, res) => {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    },
    stripe: {
      secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'なし',
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

// Stripe接続テスト
router.get('/stripe-test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Stripeライブラリをインポート
    const Stripe = require('stripe');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({
        success: false,
        error: 'STRIPE_SECRET_KEY が設定されていません'
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });

    // Stripeアカウント情報を取得してテスト
    const account = await stripe.accounts.retrieve();
    
    res.json({
      success: true,
      stripe: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
        isLive: !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      code: error.code || 'unknown'
    });
  }
});

export default router;