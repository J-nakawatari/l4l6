import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate as authMiddleware } from '../middleware/auth';
import { User } from '../models/User';

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
      name: 'ベーシックプラン',
      description: '次回予想15個（AIハイブリッド予想12個＋個別アルゴリズム予想3個）',
      amount: 980,
      interval: 'month' as const,
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
    console.error('Failed to retrieve price:', error);
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
    const { planId, billingPeriod, priceId } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const userId = req.user._id;
    const userEmail = req.user.email;

    // 開発環境では即座にサブスクリプションを有効化（一時的な対応）
    if (process.env.NODE_ENV === 'development') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await User.findByIdAndUpdate(userId, {
        subscription: {
          status: 'active',
          plan: 'basic',
          currentPeriodEnd: expiresAt,
          expiresAt,
        },
      });

      res.json({ 
        url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
        devMode: true 
      });
      return;
    }

    let lineItems;
    
    // priceIdが提供された場合は既存の価格IDを使用
    if (priceId) {
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    } else {
      // プランとbillingPeriodの検証
      if (!PLANS[planId as keyof typeof PLANS]) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
        res.status(400).json({ error: 'Invalid billing period' });
        return;
      }

      const planInfo = PLANS[planId as keyof typeof PLANS]['monthly'];
      
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

    // チェックアウトセッションを作成
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        planId: planId || 'basic',
        billingPeriod: billingPeriod || 'monthly',
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
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
    console.error('Failed to confirm subscription:', error);
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

// サブスクリプション情報取得（デバッグ用）
router.get('/subscription-status', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('subscription');
    
    res.json({
      subscription: user?.subscription,
      hasActiveSubscription: user?.hasActiveSubscription()
    });
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Stripe Webhook
router.post('/webhook', async (req, res): Promise<void> => {
  console.log('Webhook received:', {
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
    console.error('Webhook signature verification failed:', {
      error: err,
      signature: sig,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
    });
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  console.log('Webhook event received:', {
    type: event.type,
    id: event.id,
    created: new Date(event.created * 1000),
  });

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

          console.log(`Subscription activated for user ${userId}`, {
            planId,
            billingPeriod,
            expiresAt,
            customerId: session.customer,
            subscriptionId: session.subscription,
          });
        } catch (error) {
          console.error('Failed to update user subscription:', {
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
        console.error('Failed to cancel user subscription:', error);
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
          console.log(`Subscription updated for user ${user._id}`);
        }
      } catch (error) {
        console.error('Failed to update subscription:', error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// サブスクリプション解除
router.post('/cancel-subscription', authMiddleware, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user || !user.subscription || user.subscription.status !== 'active') {
      res.status(400).json({ error: '有効なサブスクリプションがありません' });
      return;
    }

    // Stripeでサブスクリプションをキャンセル
    if (user.subscription.stripeSubscriptionId) {
      try {
        await getStripe().subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Failed to cancel Stripe subscription:', stripeError);
      }
    }

    // ユーザーのサブスクリプション情報を更新
    user.subscription.status = 'cancelled';
    await user.save();

    res.json({ message: 'サブスクリプションを解除しました' });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    res.status(500).json({ error: 'サブスクリプションの解除に失敗しました' });
  }
});

export default router;