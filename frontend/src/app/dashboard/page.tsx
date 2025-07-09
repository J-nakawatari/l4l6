'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface NextPrediction {
  drawNumber: number;
  drawDate: string;
  dayOfWeek: string;
  predictions: {
    hybrid: string[];
    transition: string;
    correlation: string;
    pattern: string;
  };
  hasSubscription?: boolean;
}

interface User {
  _id: string;
  email: string;
  name: string;
  subscription?: {
    status: 'active' | 'inactive' | 'cancelled';
    plan?: 'free' | 'basic';
  };
}

interface PriceInfo {
  amount: number;
  currency: string;
  interval: string;
}

const dayOfWeekMap: Record<string, string> = {
  'Monday': '月',
  'Tuesday': '火',
  'Wednesday': '水',
  'Thursday': '木',
  'Friday': '金',
  'Saturday': '土',
  'Sunday': '日'
};

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [nextPrediction, setNextPrediction] = useState<NextPrediction | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchNextPrediction();
    fetchPriceInfo();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchNextPrediction = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/draw-results/next-prediction`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch next prediction');
      }

      const data = await response.json();
      setNextPrediction(data);
    } catch (error) {
      console.error('Error fetching next prediction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPriceInfo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payment/price-info/price_1RieIg1qmMqgQ3qQ4PbwxTfq`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPriceInfo(data);
      }
    } catch (error) {
      console.error('Error fetching price info:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsCheckingOut(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: 'price_1RieIg1qmMqgQ3qQ4PbwxTfq'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        alert('チェックアウトセッションの作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('エラーが発生しました');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!nextPrediction) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <div className="text-gray-500">予想を取得できませんでした</div>
        </div>
      </DashboardLayout>
    );
  }

  const hasSubscription = nextPrediction.hasSubscription;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            次回予想
          </h1>
          <div className="text-lg text-gray-600 dark:text-gray-400">
            第{nextPrediction.drawNumber}回 ナンバーズ4
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {new Date(nextPrediction.drawDate).toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}（{dayOfWeekMap[nextPrediction.dayOfWeek] || nextPrediction.dayOfWeek}）
          </div>
        </div>

        {/* サブスク未加入の場合のCTA */}
        {!hasSubscription && (
          <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg text-center">
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
              サブスク加入で次回の予想が確認できます
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AIが分析した高精度な予想を毎回ご利用いただけます
            </p>
            <button
              onClick={handleSubscribe}
              disabled={isCheckingOut}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? '処理中...' : `サブスク加入する（${priceInfo ? `月額${priceInfo.amount}円` : '月額980円'}）`}
            </button>
          </div>
        )}

        {/* メイン予想（ハイブリッド） */}
        <div className={`card p-8 mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 relative overflow-hidden`}>
          {!hasSubscription && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">サブスク限定コンテンツ</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">予想を見るにはサブスクリプションが必要です</div>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100 mb-6">
            AI ハイブリッド予想（12点）
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {nextPrediction.predictions.hybrid.map((number, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {number}
                </div>
                <div className="text-xs text-gray-500 mt-1">予想 {index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* サブ予想 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {!hasSubscription && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">サブスク限定コンテンツ</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">個別アルゴリズム予想もご利用いただけます</div>
              </div>
            </div>
          )}
          {/* 遷移確率ベース */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              遷移確率予想
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
                {nextPrediction.predictions.transition}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              前回の数字からの遷移確率を分析
            </p>
          </div>

          {/* 位置相関ベース */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              位置相関予想
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
                {nextPrediction.predictions.correlation}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              各位置の数字の相関関係を分析
            </p>
          </div>

          {/* パターンベース */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              パターン予想
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
                {nextPrediction.predictions.pattern}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              出現パターンの統計分析
            </p>
          </div>
        </div>

        {/* 注意書き */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>※ これらの予想は過去のデータを分析したAIアルゴリズムによるものです</p>
          <p>※ 宝くじは偶然性のゲームであり、当選を保証するものではありません</p>
        </div>
      </div>
    </DashboardLayout>
  );
}