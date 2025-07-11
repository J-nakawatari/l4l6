import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate as authMiddleware } from '../middleware/auth';
import { User } from '../models/User';
import { log } from '../utils/logger';

const router = Router();

// Stripeインスタンスを遅延初期化
let stripe: Stripe;

function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-06-30.basil',
    });
  }
  return stripe;
}

// プラン情報の定義
const PLANS = {
  basic: {
    monthly: {
      name: 'ベーシックプラン（月額）',
      description: 'データ分析予想、過去の予想結果閲覧、メールサポート',
      amount: 980,
      interval: 'month' as const,
    },
    yearly: {
      name: 'ベーシックプラン（年額）',
      description: 'データ分析予想、過去の予想結果閲覧、メールサポート',
      amount: 9800,
      interval: 'year' as const,
    },
  },
  premium: {
    monthly: {
      name: 'プレミアムプラン（月額）',
      description: 'AI予想＋データ分析予想、過去の予想結果閲覧、予想の詳細解説、当選確率の統計情報、優先メールサポート',
      amount: 1980,
      interval: 'month' as const,
    },
    yearly: {
      name: 'プレミアムプラン（年額）',
      description: 'AI予想＋データ分析予想、過去の予想結果閲覧、予想の詳細解説、当選確率の統計情報、優先メールサポート',
      amount: 19800,
      interval: 'year' as const,
    },
  },
};

// 価格情報取得
router.get('/price-info/:priceId', async (req, res): Promise<void> => {
  try {
    const { priceId } = req.params;
    
    const price = await getStripe().prices.retrieve(priceId, {
      expand: ['product']
    });
    
    res.json({
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      product: price.product
    });
  } catch (error) {
    log.error('Failed to retrieve price', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to retrieve price information',
      message: errorMessage,
      priceId: req.params.priceId
    });
  }
});

// チェックアウトセッション作成
router.post('/create-checkout-session', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    // === 本番環境用詳細ログ開始 ===
    console.log('🚀 チェックアウトセッション作成開始 [本番環境]');
    console.log('タイムスタンプ:', new Date().toISOString());
    console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));
    console.log('ユーザー情報:', {
      userId: req.user?._id,
      email: req.user?.email,
      emailVerified: req.user?.emailVerified
    });
    console.log('環境変数チェック:', {
      stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12),
      frontendUrl: process.env.FRONTEND_URL
    });
    // === 本番環境用詳細ログ終了 ===
    
    const { planId, billingPeriod, priceId } = req.body;
    
    if (!req.user) {
      console.log('❌ ユーザー認証エラー');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const userId = req.user._id;
    const userEmail = req.user.email;

    console.log('✅ ユーザー認証成功:', { userId, userEmail });

    // 既存のサブスクリプションをチェック
    const user = await User.findById(userId);
    console.log('📊 ユーザー情報取得:', {
      userFound: !!user,
      subscriptionStatus: user?.subscription?.status,
      emailVerified: user?.emailVerified
    });

    if (user?.subscription?.status === 'active') {
      console.log('❌ 既にアクティブなサブスクリプション存在');
      res.status(400).json({ error: { code: 'ALREADY_SUBSCRIBED', message: 'Already have an active subscription' } });
      return;
    }

    // メール確認をチェック
    if (!user?.emailVerified) {
      console.log('❌ メール未確認');
      res.status(403).json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' } });
      return;
    }

    console.log('✅ 事前チェック完了');

    let lineItems;
    
    // priceIdが提供された場合は既存の価格IDを使用
    if (priceId) {
      console.log('💰 priceId使用:', priceId);
      // 有効な価格IDのパターンをチェック（price_で始まる）
      if (!priceId.startsWith('price_')) {
        console.log('❌ 無効なpriceID形式:', priceId);
        res.status(400).json({ error: { code: 'INVALID_PRICE_ID', message: 'Invalid price ID format' } });
        return;
      }
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    } else {
      console.log('📋 プラン情報から作成:', { planId, billingPeriod });
      
      // プランとbillingPeriodの検証
      if (!PLANS[planId as keyof typeof PLANS]) {
        console.log('❌ 無効なプランID:', planId);
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
        console.log('❌ 無効な請求期間:', billingPeriod);
        res.status(400).json({ error: 'Invalid billing period' });
        return;
      }

      const plan = PLANS[planId as keyof typeof PLANS];
      const planInfo = plan[billingPeriod as keyof typeof plan];
      
      if (!planInfo) {
        console.log('❌ 無効なプラン設定:', { planId, billingPeriod });
        res.status(400).json({ error: 'Invalid plan configuration' });
        return;
      }
      
      lineItems = [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: planInfo.name,
              description: planInfo.description,
            },
            recurring: {
              interval: planInfo.interval,
            },
            unit_amount: planInfo.amount,
          },
          quantity: 1,
        },
      ];
    }

    console.log('💳 Line items準備完了:', JSON.stringify(lineItems, null, 2));

    // 開発・テスト環境では即座にサブスクリプションを有効化（一時的な対応）
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_dummy')) {
      console.log('🧪 テスト環境: ダミーセッション作成');
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await User.findByIdAndUpdate(userId, {
        subscription: {
          status: 'active',
          plan: planId || 'basic',
          currentPeriodEnd: expiresAt,
          expiresAt,
        },
      });

      res.json({ 
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      });
      return;
    }

    console.log('🔥 Stripe チェックアウトセッション作成開始');

    // チェックアウトセッションを作成
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription`,
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        planId: planId || 'basic',
        billingPeriod: billingPeriod || 'monthly',
      },
    });

    console.log('✅ チェックアウトセッション作成成功:', {
      sessionId: session.id,
      url: session.url ? '存在' : '不存在'
    });

    res.json({ url: session.url });
  } catch (error) {
    // === 本番環境用詳細エラーログ ===
    console.error('❌ チェックアウトセッション作成エラー [詳細]:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw,
      stack: error.stack?.split('\n').slice(0, 5), // スタックトレースの最初の5行のみ
      timestamp: new Date().toISOString()
    });
    
    log.error('Failed to create checkout session', { error });
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'production' ? error.message : error
    });
  }
});

// 購入成功確認（フォールバック）
router.post('/confirm-subscription', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Stripeからセッション情報を取得
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.metadata?.userId === userId.toString()) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await User.findByIdAndUpdate(userId, {
        subscription: {
          status: 'active',
          plan: session.metadata?.planId || 'basic',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          currentPeriodEnd: expiresAt,
          expiresAt,
        },
      });

      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid session or payment not completed' });
    }
  } catch (error) {
    log.error('Failed to confirm subscription', { error });
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

// サブスクリプション情報取得（デバッグ用）
router.get('/subscription-status', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('subscription');
    
    if (!user?.subscription || user.subscription.status === 'inactive') {
      res.json({
        subscription: {
          status: 'inactive',
          isActive: false
        }
      });
      return;
    }

    const currentPeriodEnd = user.subscription.currentPeriodEnd;
    const isActive = currentPeriodEnd ? new Date(currentPeriodEnd) > new Date() : false;
    const daysRemaining = currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      subscription: {
        status: user.subscription.status,
        stripeCustomerId: user.subscription.stripeCustomerId,
        stripeSubscriptionId: user.subscription.stripeSubscriptionId,
        currentPeriodEnd: currentPeriodEnd,
        isActive: isActive,
        daysRemaining
      }
    });
  } catch (error) {
    log.error('Failed to get subscription status', { error });
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Billing Portal
router.post('/portal', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user?.subscription || user.subscription.status === 'inactive') {
      res.status(400).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' } });
      return;
    }

    if (!user.subscription.stripeCustomerId) {
      res.status(400).json({ error: { code: 'NO_CUSTOMER_ID', message: 'No Stripe customer ID' } });
      return;
    }

    // 開発・テスト環境ではダミーURLを返す
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_dummy')) {
      res.json({ url: 'https://billing.stripe.com/session/bps_test_123' });
      return;
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: req.body.returnUrl || `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    log.error('Failed to create billing portal session', { error });
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// キャンセル
router.post('/cancel-subscription', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user?.subscription || user.subscription.status === 'inactive') {
      res.status(400).json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' } });
      return;
    }

    if (user.subscription.status === 'cancelled') {
      res.status(400).json({ error: { code: 'ALREADY_CANCELLED', message: 'Subscription already cancelled' } });
      return;
    }

    // 開発・テスト環境では即座にキャンセル
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_dummy')) {
      user.subscription.status = 'cancelled';
      await user.save();
      
      res.json({ 
        message: 'Subscription cancelled successfully',
        cancelAt: user.subscription.currentPeriodEnd
      });
      return;
    }

    // 本番環境ではStripeでキャンセル
    if (user.subscription.stripeSubscriptionId) {
      const subscription = await getStripe().subscriptions.update(
        user.subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
      
      user.subscription.status = 'cancelled';
      await user.save();
      
      res.json({ 
        message: 'Subscription cancelled successfully',
        cancelAt: new Date((subscription as any).current_period_end * 1000)
      });
    }
  } catch (error) {
    log.error('Failed to cancel subscription', { error });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe Webhook
router.post('/webhook', async (req, res): Promise<void> => {
  log.info('Webhook received', {
    headers: req.headers,
    bodyLength: req.body?.length,
  });
  
  const sig = req.headers['stripe-signature'] as string;
  
  let event: Stripe.Event;
  
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    log.error('Webhook signature verification failed', {
      error: err,
      signature: sig,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
    });
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  log.info('Webhook event received', {
    type: event.type,
    id: event.id,
    created: new Date(event.created * 1000),
  });

  try {
    // イベントを処理
    switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // ユーザーのサブスクリプションを更新
      const { userId, planId, billingPeriod } = session.metadata || {};
      
      if (userId && planId) {
        try {
          const expiresAt = new Date();
          if (billingPeriod === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }

          await User.findByIdAndUpdate(userId, {
            subscription: {
              status: 'active',
              plan: planId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              currentPeriodEnd: expiresAt,
              expiresAt,
            },
          });

          log.info(`Subscription activated for user ${userId}`, {
            planId,
            billingPeriod,
            expiresAt,
            customerId: session.customer,
            subscriptionId: session.subscription,
          });
        } catch (error) {
          log.error('Failed to update user subscription', {
            error,
            userId,
            sessionId: session.id,
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      
      // サブスクリプションをキャンセル
      try {
        await User.findOneAndUpdate(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            subscription: {
              status: 'inactive',
              plan: 'free',
              stripeSubscriptionId: null,
              expiresAt: null,
            },
          }
        );

      } catch (error) {
        log.error('Failed to cancel user subscription', { error });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      
      // サブスクリプションの更新を処理
      try {
        const user = await User.findOne({
          'subscription.stripeSubscriptionId': subscription.id,
        });

        if (user) {
          // プラン変更などの処理
          log.info(`Subscription updated for user ${user._id}`);
        }
      } catch (error) {
        log.error('Failed to update subscription', { error });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      
      // 支払い失敗を処理
      try {
        const user = await User.findOne({
          'subscription.stripeCustomerId': invoice.customer as string,
        });
        
        if (user && user.subscription) {
          user.subscription.status = 'past_due' as any;
          await user.save();
          
          log.info(`Payment failed for user ${user._id}`, {
            customerId: invoice.customer,
            subscriptionId: (invoice as any).subscription,
          });
        }
      } catch (error) {
        log.error('Failed to handle payment failure', { error });
      }
      break;
    }

    default:
      log.info(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    log.error('Error processing webhook', { error, eventType: event.type });
    res.status(500).json({ error: { code: 'WEBHOOK_ERROR', message: 'Failed to process webhook' } });
  }
});


export default router;