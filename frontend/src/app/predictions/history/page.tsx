'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface Prediction {
  _id: string;
  drawNumber: number;
  predictions: {
    dataLogic: string[];
    ai: string[];
  };
  result?: {
    winning: string;
    isWin: boolean;
    prize: number;
  };
  createdAt: string;
  analysis?: {
    dataLogic?: {
      frequency: Record<string, number>;
      patterns: string[];
    };
    ai?: {
      confidence: number;
      features: string[];
    };
  };
}

interface PredictionResponse {
  predictions: Prediction[];
  totalPages: number;
  currentPage: number;
}

export default function PredictionHistoryPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'dataLogic' | 'ai'>('all');
  const [winOnly, setWinOnly] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, [currentPage, filterType, winOnly]);

  const fetchPredictions = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      if (winOnly) {
        params.append('winOnly', 'true');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/predictions/history?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch predictions');
      }

      const data: PredictionResponse = await response.json();
      setPredictions(data.predictions);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCsv = () => {
    const headers = ['抽選回', '予想日時', '予想方法', '予想番号', '当選番号', '当選結果', '賞金'];
    const rows = predictions.map((pred) => {
      const dataLogicNumbers = pred.predictions.dataLogic.join(' ');
      const aiNumbers = pred.predictions.ai.join(' ');
      const allNumbers = `データ分析: ${dataLogicNumbers} / AI: ${aiNumbers}`;
      
      return [
        pred.drawNumber,
        new Date(pred.createdAt).toLocaleDateString('ja-JP'),
        'データ分析+AI',
        allNumbers,
        pred.result?.winning || '-',
        pred.result?.isWin ? '当選' : '落選',
        pred.result?.prize ? `${pred.result.prize.toLocaleString()}円` : '-',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prediction_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">過去の予想結果</h1>
          {predictions.length > 0 && (
            <button
              onClick={exportToCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              CSVエクスポート
            </button>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                予想方法
              </label>
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as 'all' | 'dataLogic' | 'ai');
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="dataLogic">データ分析のみ</option>
                <option value="ai">AIのみ</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="win-filter"
                checked={winOnly}
                onChange={(e) => {
                  setWinOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="win-filter" className="ml-2 text-sm text-gray-700">
                当選のみ表示
              </label>
            </div>
          </div>
        </div>

        {/* 予想結果一覧 */}
        {predictions.length > 0 ? (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <div
                key={prediction._id}
                data-testid={`prediction-${prediction._id}`}
                className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                  prediction.result?.isWin ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        第{prediction.drawNumber}回
                      </h3>
                      <span className="text-sm text-gray-500">
                        {new Date(prediction.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                      {prediction.result?.isWin && (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                          当選！
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {prediction.predictions.dataLogic.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">データ分析予想</h4>
                          <div className="flex flex-wrap gap-2">
                            {prediction.predictions.dataLogic.map((num, index) => (
                              <span
                                key={index}
                                className={`font-mono px-3 py-1 rounded ${
                                  prediction.result?.winning === num
                                    ? 'bg-green-100 text-green-800 font-bold'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {prediction.predictions.ai.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">AI予想</h4>
                          <div className="flex flex-wrap gap-2">
                            {prediction.predictions.ai.map((num, index) => (
                              <span
                                key={index}
                                className={`font-mono px-3 py-1 rounded ${
                                  prediction.result?.winning === num
                                    ? 'bg-green-100 text-green-800 font-bold'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {prediction.result && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-sm text-gray-600">当選番号: </span>
                            <span className="font-mono font-bold text-lg">{prediction.result.winning}</span>
                          </div>
                          {prediction.result.isWin && (
                            <div>
                              <span className="text-sm text-gray-600">賞金: </span>
                              <span className="font-bold text-lg text-green-600">
                                {prediction.result.prize.toLocaleString()}円
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedPrediction(prediction)}
                    className="ml-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    詳細を見る
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600 text-lg">まだ予想履歴がありません</p>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="前のページ"
              className={`px-4 py-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              前へ
            </button>

            <span className="text-gray-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label="次のページ"
              className={`px-4 py-2 rounded-lg ${
                currentPage === totalPages
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              次へ
            </button>
          </div>
        )}

        {/* 詳細モーダル */}
        {selectedPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  予想詳細 - 第{selectedPrediction.drawNumber}回
                </h2>
                <button
                  onClick={() => setSelectedPrediction(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* データ分析予想の詳細 */}
                {selectedPrediction.analysis?.dataLogic && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">データ分析予想</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">数字の出現頻度</h4>
                        <div className="grid grid-cols-10 gap-2">
                          {Object.entries(selectedPrediction.analysis.dataLogic.frequency).map(([digit, freq]) => (
                            <div key={digit} className="text-center">
                              <div className="font-mono font-bold">{digit}</div>
                              <div className="text-sm text-gray-600">{freq}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">検出パターン</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrediction.analysis.dataLogic.patterns.map((pattern, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI予想の詳細 */}
                {selectedPrediction.analysis?.ai && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">AI予想</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">予想の信頼度</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-purple-600 h-4 rounded-full"
                              style={{ width: `${selectedPrediction.analysis.ai.confidence * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold">
                            信頼度: {Math.round(selectedPrediction.analysis.ai.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">分析特徴</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrediction.analysis.ai.features.map((feature, index) => (
                            <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 結果 */}
                {selectedPrediction.result && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">抽選結果</h3>
                    <div className={`rounded-lg p-4 ${
                      selectedPrediction.result.isWin
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700">当選番号: </span>
                          <span className="font-mono font-bold text-xl">{selectedPrediction.result.winning}</span>
                        </div>
                        {selectedPrediction.result.isWin && (
                          <div className="text-right">
                            <div className="text-green-800 font-bold text-xl">当選！</div>
                            <div className="text-green-600 font-semibold">
                              {selectedPrediction.result.prize.toLocaleString()}円
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}