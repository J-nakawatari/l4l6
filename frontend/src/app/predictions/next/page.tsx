'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface NextPrediction {
  id: string;
  drawNumber: number;
  drawDate: string;
  dataLogicPredictions: string[];
  aiPredictions: string[];
  viewCount: number;
}

interface PredictionResponse {
  prediction: NextPrediction;
}

export default function NextPredictionPage() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<NextPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    fetchNextPrediction();
  }, []);

  const fetchNextPrediction = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/predictions/latest`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const errorData = await response.json();
        setError(errorData.error);
        return;
      }

      const data: PredictionResponse = await response.json();
      setPrediction(data.prediction);
    } catch (err) {
      console.error('Error fetching next prediction:', err);
      setError({ code: 'UNKNOWN_ERROR', message: 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[500px]">
          <div 
            data-testid="loading-spinner"
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          ></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    if (error.code === 'SUBSCRIPTION_REQUIRED') {
      return (
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">有料会員限定コンテンツ</h2>
              <p className="text-gray-700 mb-6">
                このページは有料会員限定です。<br />
                サブスクリプションに登録すると、次回の予想番号をご覧いただけます。
              </p>
              <Link
                href="/subscription"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                サブスクリプションに登録
              </Link>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    if (error.code === 'SUBSCRIPTION_EXPIRED') {
      return (
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                サブスクリプションの有効期限が切れています
              </h2>
              <p className="text-gray-700 mb-6">
                サブスクリプションを更新してください。
              </p>
              <Link
                href="/subscription"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                サブスクリプションを更新
              </Link>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    if (error.code === 'NO_PREDICTIONS') {
      return (
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                次回予想はまだ準備中です
              </h2>
              <p className="text-gray-700">
                次回予想は抽選日の3日前に公開されます。<br />
                もうしばらくお待ちください。
              </p>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h2>
            <p className="text-gray-700">{error.message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!prediction) {
    return null;
  }

  const drawDate = new Date(prediction.drawDate);
  const formattedDate = drawDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            次回予想 - 第{prediction.drawNumber}回
          </h1>
          <p className="text-gray-600 mt-2">抽選日: {formattedDate}</p>
        </div>

        {/* 重要な注意事項 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-amber-600 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">ご利用にあたっての注意</h3>
              <p className="text-sm text-amber-700">
                この予想は過去のデータ分析とAIによる予測に基づいていますが、当選を保証するものではありません。
                宝くじの購入は計画的に、無理のない範囲で行ってください。
              </p>
            </div>
          </div>
        </div>

        {/* データ分析による予想 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            データ分析による予想
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {prediction.dataLogicPredictions.map((num, index) => (
              <div
                key={index}
                className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center"
              >
                <div className="text-3xl font-bold text-blue-600 font-mono">{num}</div>
                <div className="text-sm text-gray-600 mt-2">予想 {index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI予想 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AIによる予想
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {prediction.aiPredictions.map((num, index) => (
              <div
                key={index}
                className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center"
              >
                <div className="text-3xl font-bold text-purple-600 font-mono">{num}</div>
                <div className="text-sm text-gray-600 mt-2">AI予想 {index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 購入のヒント */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">購入のヒント</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700">
                <strong>ストレート購入：</strong>数字の並び順も含めて的中を狙う場合は、表示されている番号をそのまま購入してください。
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700">
                <strong>ボックス購入：</strong>数字の組み合わせが合っていれば当選となるため、当選確率が上がります。
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700">
                <strong>複数購入：</strong>データ分析とAIの両方の予想を購入することで、異なるアプローチからの予想をカバーできます。
              </p>
            </div>
          </div>
        </div>

        {/* 免責事項 */}
        <div className="mt-8 text-sm text-gray-600 text-center">
          <p>
            ※ 本サービスは娯楽を目的としており、ギャンブルを推奨するものではありません。<br />
            ※ 予想の的中を保証するものではありません。自己責任でご利用ください。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}