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
      name: 'ベーシックプラン（月額）',
      description: '次回予想15個（AI予想12個＋個別アルゴリズム予想3個）',
      amount: 980,
      interval: 'month' as const,
    },
    yearly: {
      name: 'ベーシックプラン（年額）',
      description: '次回予想15個（AI予想12個＋個別アルゴリズム予想3個）',
      amount: 9800,
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
    console.error('Failed to retrieve price:', error);
    res.status(500).json({ error: 'Failed to retrieve price information' });
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

      const planInfo = PLANS[planId as keyof typeof PLANS][billingPeriod as 'monthly' | 'yearly'];
      
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

    // Stripeチェックアウトセッションを作成
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription`,
      metadata: {
        userId: userId.toString(),
        planId,
        billingPeriod,
      },
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session'
    });
  }
});

// Stripe Webhookハンドラー
router.post('/webhook', async (req, res): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

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
              stripeSubscriptionId: session.subscription,
              expiresAt,
            },
          });

        } catch (error) {
          console.error('Failed to update user subscription:', error);
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

export default router;