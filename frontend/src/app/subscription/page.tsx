'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import DashboardLayout from '@/components/Layout/DashboardLayout';

// Stripeは後で設定
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Plan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  recommended?: boolean;
}

interface CurrentSubscription {
  plan: string;
  status: string;
  expiresAt: string;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'ベーシックプラン',
    price: {
      monthly: 980,
      yearly: 9800,
    },
    features: [
      'データ分析予想',
      '過去の予想結果閲覧',
      'メールサポート',
    ],
  },
  {
    id: 'premium',
    name: 'プレミアムプラン',
    price: {
      monthly: 1980,
      yearly: 19800,
    },
    features: [
      'AI予想＋データ分析予想',
      '過去の予想結果閲覧',
      '予想の詳細解説',
      '当選確率の統計情報',
      '優先メールサポート',
    ],
    recommended: true,
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/users/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription && data.subscription.status === 'active') {
          setCurrentSubscription(data.subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          billingPeriod: isYearly ? 'yearly' : 'monthly',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('チェックアウトセッションの作成に失敗しました');
      }

      const { sessionId } = await response.json();

      // Stripeのチェックアウトページにリダイレクト
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripeの初期化に失敗しました');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        setError(error.message || '決済処理中にエラーが発生しました');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プランを選択</h1>

        {currentSubscription && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-blue-800">
              現在のプラン: {currentSubscription.plan === 'premium' ? 'プレミアムプラン' : 'ベーシックプラン'}
            </p>
            <p className="text-sm text-blue-600">
              有効期限: {new Date(currentSubscription.expiresAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}
            </p>
          </div>
        )}

        {/* 料金プラン切り替え */}
        <div className="flex items-center justify-center mb-8">
          <span className={`mr-3 ${!isYearly ? 'font-semibold' : ''}`}>月額プラン</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isYearly}
              onChange={(e) => setIsYearly(e.target.checked)}
              className="sr-only peer"
              aria-label="年間プラン"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className={`ml-3 ${isYearly ? 'font-semibold' : ''}`}>年間プラン</span>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
            {error}
          </div>
        )}

        {/* プラン一覧 */}
        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              data-testid={`plan-${plan.id}`}
              className={`relative bg-white rounded-lg shadow-lg p-8 ${
                plan.recommended ? 'border-2 border-blue-500' : 'border border-gray-200'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    おすすめ
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h2>

              <div className="mb-6">
                <p className="text-4xl font-bold text-gray-900">
                  {isYearly ? (
                    <>
                      年額 {plan.price.yearly.toLocaleString()}円
                      {plan.price.yearly < plan.price.monthly * 12 && (
                        <span className="text-sm text-green-600 block">
                          2ヶ月分お得！
                        </span>
                      )}
                    </>
                  ) : (
                    <>月額 {plan.price.monthly.toLocaleString()}円</>
                  )}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isLoading && selectedPlan === plan.id}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                  plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-800 text-white hover:bg-gray-900'
                } ${
                  isLoading && selectedPlan === plan.id
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {isLoading && selectedPlan === plan.id
                  ? '処理中...'
                  : 'このプランを選択'}
              </button>
            </div>
          ))}
        </div>

        {/* 注意事項 */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>・すべてのプランは自動更新されます</p>
          <p>・いつでもキャンセル可能です</p>
          <p>・プラン変更は次回更新時に適用されます</p>
        </div>
      </div>
    </DashboardLayout>
  );
}