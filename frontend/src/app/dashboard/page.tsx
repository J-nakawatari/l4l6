'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface UserData {
  email: string;
  subscription: {
    status: string;
    plan: string;
    expiresAt: string | null;
  };
}

interface Prediction {
  drawNumber: number;
  predictions: {
    dataLogic: string[];
    ai: string[];
  };
  createdAt: string;
}

interface PredictionHistory {
  drawNumber: number;
  drawDate: string;
  dayOfWeek: string;
  winningNumber: string;
  kakoPrediction: string;
  patterns: string[];
  patternCount: number;
  purchaseCount: number;
  purchaseAmount: number;
  winType: 'straight' | 'box' | null;
  winAmount: number;
  prizeInfo: {
    straight?: { amount: number; winners: number };
    box?: { amount: number; winners: number };
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [subscriptionPrice, setSubscriptionPrice] = useState<string>('1,980');
  
  const currentYear = new Date().getFullYear();
  const currentYearHistory = predictionHistory.filter(h => 
    new Date(h.drawDate).getFullYear() === currentYear
  );

  useEffect(() => {
    fetchDashboardData();
    fetchPriceInfo();
  }, []);

  const fetchPriceInfo = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payments/price-info/price_1RieIg1qmMqgQ3qQ4PbwxTfq`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.amount) {
          setSubscriptionPrice(data.amount.toLocaleString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch price info:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsProcessingCheckout(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: 'price_1RieIg1qmMqgQ3qQ4PbwxTfq',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('チェックアウトセッションの作成に失敗しました');
      }

      const { url } = await response.json();
      
      // Stripe Checkoutページにリダイレクト
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // ユーザー情報を取得
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/users/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/login');
          return;
        }
        console.error('Failed to fetch user data:', userResponse.status);
        return;
      }

      const userData = await userResponse.json();
      setUserData(userData);

      // 最新の予想を取得（有料会員のみ）
      if (userData.subscription && userData.subscription.status === 'active') {
        const predictionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/predictions/latest`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (predictionResponse.ok) {
          const predictionData = await predictionResponse.json();
          setLatestPrediction(predictionData.latestPrediction);
        }
      }

      // 過去の予想結果を取得（kako algorithm）
      const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/draw-results/history-with-prediction?limit=10`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setPredictionHistory(historyData.results || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[500px]">
          <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isPremium = userData?.subscription?.status === 'active';

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ダッシュボード</h1>
          <p className="text-gray-600 dark:text-gray-400">{currentYear}年の予想と統計情報</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="stats-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="stats-value">{currentYearHistory.length}</p>
            <p className="stats-label">予想回数</p>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="stats-value">{currentYearHistory.filter(h => h.winType !== null).length}</p>
            <p className="stats-label">当選回数</p>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="stats-value">
              {currentYearHistory.reduce((sum, h) => sum + (h.winType !== null ? h.winAmount : 0), 0).toLocaleString()}
            </p>
            <p className="stats-label">獲得賞金（円）</p>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <p className="stats-value">
              {currentYearHistory.length > 0 
                ? Math.round((currentYearHistory.filter(h => h.winType !== null).length / currentYearHistory.length) * 100)
                : 0}%
            </p>
            <p className="stats-label">的中率</p>
          </div>
        </div>

        {/* 次回予想セクション */}
        <section className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">次回予想</h2>
          </div>
          
          {isPremium && latestPrediction ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  第{latestPrediction.drawNumber}回 予想番号
                </h3>
                <span className="badge badge-primary">最新</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">データ分析予想</h4>
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    {latestPrediction.predictions.dataLogic.map((num, index) => (
                      <div key={index} className="lottery-number w-12 h-12 sm:w-16 sm:h-16 text-lg sm:text-2xl">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">AI予想</h4>
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    {latestPrediction.predictions.ai.map((num, index) => (
                      <div key={index} className="lottery-number w-12 h-12 sm:w-16 sm:h-16 text-lg sm:text-2xl">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  生成日時: {new Date(latestPrediction.createdAt).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="empty-state-title">プレミアム機能</h3>
                <p className="empty-state-message mb-6">
                  有料会員にアップグレードして、AI予想と統計分析予想をご利用ください
                </p>
                <button
                  onClick={handleSubscribe}
                  disabled={isProcessingCheckout}
                  className="btn btn-md btn-primary"
                >
                  {isProcessingCheckout ? '処理中...' : `サブスク加入（月額${subscriptionPrice}円）`}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 過去の予想結果セクション */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">過去の予想結果（過去10回分）</h2>
            <button
              onClick={() => router.push('/predictions')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
            >
              予想一覧へ
            </button>
          </div>
          
          {predictionHistory && predictionHistory.length > 0 ? (
            <div className="space-y-4">
              {predictionHistory.map((history) => (
                <div
                  key={history.drawNumber}
                  className={`card p-6 hover:shadow-lg transition-shadow relative ${
                    history.winType ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                  }`}
                >
                  {history.winType && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full shadow-md animate-pulse">
                      <span className="text-lg">🎉</span>
                      <span className="text-sm font-bold">予想的中！</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">第{history.drawNumber}回</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(history.drawDate).toLocaleDateString('ja-JP')}（{history.dayOfWeek}）
                      </span>
                      {history.winType && (
                        <span className={`badge ${
                          history.winType === 'straight' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                        } px-3 py-1 rounded-full text-sm font-medium`}>
                          {history.winType === 'straight' ? 'ストレート' : 'ボックス'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 予想と結果 */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">予想・結果</h5>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">予想番号:</span>
                          <div className="flex gap-1">
                            {history.kakoPrediction.split('').map((digit, index) => (
                              <div key={index} className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center font-mono font-semibold text-sm text-blue-700 dark:text-blue-300">
                                {digit}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">当選番号:</span>
                          <div className="flex gap-1">
                            {history.winningNumber.split('').map((digit, index) => (
                              <div key={index} className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center font-mono font-semibold text-sm text-gray-900 dark:text-white">
                                {digit}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          パターン数: {history.patternCount}通り
                        </div>
                      </div>
                    </div>
                    
                    {/* 購入・賞金情報 */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">購入・賞金情報</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">購入口数:</span>
                          <span className="font-medium">{history.purchaseCount}口</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">購入金額:</span>
                          <span className="font-medium">{history.purchaseAmount.toLocaleString()}円</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                          <span className={`font-medium ${
                            history.winAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {history.winAmount > 0 ? '+' : ''}{history.winAmount.toLocaleString()}円
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-600 dark:text-gray-400">収支:</span>
                          <span className={`font-semibold ${
                            history.winAmount - history.purchaseAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {history.winAmount - history.purchaseAmount > 0 ? '+' : ''}{(history.winAmount - history.purchaseAmount).toLocaleString()}円
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="empty-state-title">予想履歴なし</h3>
                <p className="empty-state-message">
                  まだ予想履歴がありません。予想を始めましょう！
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}