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
  predictions: string[];
  result?: {
    winning: string;
    isWin: boolean;
    prize: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // ユーザー情報を取得
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/users/me`, {
        credentials: 'include',
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      setUserData(userData);

      // 最新の予想を取得（有料会員のみ）
      if (userData.subscription.status === 'active') {
        const predictionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/predictions/latest`, {
          credentials: 'include',
        });

        if (predictionResponse.ok) {
          const predictionData = await predictionResponse.json();
          setLatestPrediction(predictionData.latestPrediction);
        }
      }

      // 過去の予想結果を取得
      const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/predictions/history`, {
        credentials: 'include',
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setPredictionHistory(historyData.predictions);
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

  const isPremium = userData?.subscription.status === 'active';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ダッシュボード</h1>

        {/* 次回予想セクション */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">次回予想</h2>
          
          {isPremium && latestPrediction ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                第{latestPrediction.drawNumber}回 予想番号
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3">データ分析予想</h4>
                  <div className="space-y-2">
                    {latestPrediction.predictions.dataLogic.map((num, index) => (
                      <div key={index} className="bg-blue-50 text-blue-700 font-mono text-lg py-2 px-4 rounded">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3">AI予想</h4>
                  <div className="space-y-2">
                    {latestPrediction.predictions.ai.map((num, index) => (
                      <div key={index} className="bg-purple-50 text-purple-700 font-mono text-lg py-2 px-4 rounded">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                生成日時: {new Date(latestPrediction.createdAt).toLocaleString('ja-JP')}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">
                有料会員にアップグレードして、AI予想と統計分析予想をご利用ください
              </p>
              <button
                onClick={() => router.push('/subscription')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                プランを見る
              </button>
            </div>
          )}
        </section>

        {/* 過去の予想結果セクション */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">過去の予想結果</h2>
          
          {predictionHistory && predictionHistory.length > 0 ? (
            <div className="space-y-4">
              {predictionHistory.map((history) => (
                <div
                  key={history.drawNumber}
                  className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                    history.result?.isWin ? 'border-green-500' : 'border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800">第{history.drawNumber}回</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(history.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {history.predictions.map((num, index) => (
                          <span key={index} className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {history.result && (
                      <div className="text-right">
                        <p className={`font-medium ${history.result.isWin ? 'text-green-600' : 'text-gray-500'}`}>
                          {history.result.isWin ? '当選！' : '残念...'}
                        </p>
                        {history.result.isWin && (
                          <p className="text-green-600 font-bold">
                            {history.result.prize.toLocaleString()}円
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          当選番号: {history.result.winning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">まだ予想履歴がありません</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}