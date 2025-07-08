import Stripe from 'stripe';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { log } from '../utils/logger';
import { sendSubscriptionConfirmationEmail } from '../utils/email';

// Stripe初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// 価格ID（環境変数から取得すべき）
const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_test_monthly',
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_test_yearly',
};

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // メール確認チェック
  if (!user.emailVerified) {
    throw new AppError('Please verify your email before subscribing', 403, 'EMAIL_NOT_VERIFIED');
  }

  // 既存のサブスクリプションチェック
  if (user.hasActiveSubscription()) {
    throw new AppError('You already have an active subscription', 400, 'ALREADY_SUBSCRIBED');
  }

  // 価格IDの検証
  if (!Object.values(PRICE_IDS).includes(priceId)) {
    throw new AppError('Invalid price ID', 400, 'INVALID_PRICE_ID');
  }

  try {
    // Stripe顧客の作成または取得
    let customerId = user.subscription?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;
      
      // 顧客IDを保存
      user.subscription = {
        ...user.subscription,
        stripeCustomerId: customerId,
      };
      await user.save();
    }

    // Checkoutセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user._id.toString(),
      },
    });

    log.info('Checkout session created', { userId, sessionId: session.id });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    log.error('Failed to create checkout session', { userId, error });
    throw new AppError('Failed to create checkout session', 500, 'STRIPE_ERROR');
  }
}

export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.subscription?.stripeCustomerId) {
    throw new AppError('No customer ID found', 400, 'NO_CUSTOMER_ID');
  }

  if (!user.subscription?.stripeSubscriptionId) {
    throw new AppError('No subscription found', 400, 'NO_SUBSCRIPTION');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    log.info('Billing portal session created', { userId });

    return { url: session.url };
  } catch (error) {
    log.error('Failed to create billing portal session', { userId, error });
    throw new AppError('Failed to create billing portal session', 500, 'STRIPE_ERROR');
  }
}

export async function cancelStripeSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<{ cancelAt: Date | null }> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediate,
    });

    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    const cancelAt = subscription.cancel_at 
      ? new Date(subscription.cancel_at * 1000) 
      : subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000)
        : null;

    log.info('Subscription cancelled', { subscriptionId, immediate });

    return { cancelAt };
  } catch (error) {
    log.error('Failed to cancel subscription', { subscriptionId, error });
    throw new AppError('Failed to cancel subscription', 500, 'STRIPE_ERROR');
  }
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    
    default:
      log.info('Unhandled webhook event type', { type: event.type });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    log.error('No userId in checkout session metadata');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    log.error('User not found for checkout completion', { userId });
    return;
  }

  // サブスクリプション情報を取得
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // ユーザーのサブスクリプション情報を更新
  user.subscription = {
    status: 'active',
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };

  await user.save();

  // 確認メール送信
  try {
    await sendSubscriptionConfirmationEmail(user.email, user.name, 'プレミアムプラン');
  } catch (error) {
    log.error('Failed to send subscription confirmation email', { userId, error });
  }

  log.info('Subscription activated', { userId, subscriptionId: subscription.id });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  if (!user) {
    log.error('User not found for subscription update', { subscriptionId: subscription.id });
    return;
  }

  user.subscription = {
    ...user.subscription,
    status: subscription.status as any,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };

  await user.save();

  log.info('Subscription updated', { userId: user._id, status: subscription.status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  if (!user) {
    log.error('User not found for subscription deletion', { subscriptionId: subscription.id });
    return;
  }

  user.subscription = {
    ...user.subscription,
    status: 'cancelled',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };

  await user.save();

  log.info('Subscription cancelled', { userId: user._id });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const user = await User.findOne({ 'subscription.stripeCustomerId': invoice.customer });
  if (!user) {
    log.error('User not found for payment failure', { customerId: invoice.customer });
    return;
  }

  // TODO: 支払い失敗メールを送信

  log.warn('Payment failed', { userId: user._id, invoiceId: invoice.id });
}