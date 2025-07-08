'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface KakoPrediction {
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

export default function PredictionHistoryPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<KakoPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'2025-01' | '2025-02' | '2025-03' | '2025-04' | '2025-05' | '2025-06' | 'all'>('all');
  const [winOnly, setWinOnly] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<KakoPrediction | null>(null);
  const [totals, setTotals] = useState({
    totalPurchase: 0,
    totalWin: 0,
    profit: 0,
    winCount: 0,
    straightCount: 0,
    boxCount: 0
  });

  useEffect(() => {
    fetchPredictions();
  }, [period, winOnly]);

  const fetchPredictions = async () => {
    try {
      setIsLoading(true);
      
      let startDate = '2025-01-01';
      let endDate = '2025-06-30';
      
      if (period !== 'all') {
        const monthMap: Record<string, { start: string; end: string }> = {
          '2025-01': { start: '2025-01-01', end: '2025-01-31' },
          '2025-02': { start: '2025-02-01', end: '2025-02-28' },
          '2025-03': { start: '2025-03-01', end: '2025-03-31' },
          '2025-04': { start: '2025-04-01', end: '2025-04-30' },
          '2025-05': { start: '2025-05-01', end: '2025-05-31' },
          '2025-06': { start: '2025-06-01', end: '2025-06-30' },
        };
        
        if (monthMap[period]) {
          startDate = monthMap[period].start;
          endDate = monthMap[period].end;
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/draw-results/history-with-prediction-period?startDate=${startDate}&endDate=${endDate}`,
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

      const data = await response.json();
      let results = data.results || [];
      
      // 当選のみフィルタリング
      if (winOnly) {
        results = results.filter((p: KakoPrediction) => p.winType !== null);
      }
      
      setPredictions(results);
      
      // 集計計算
      const totalPurchase = results.reduce((sum: number, p: KakoPrediction) => sum + p.purchaseAmount, 0);
      const totalWin = results.reduce((sum: number, p: KakoPrediction) => sum + p.winAmount, 0);
      const winCount = results.filter((p: KakoPrediction) => p.winType !== null).length;
      const straightCount = results.filter((p: KakoPrediction) => p.winType === 'straight').length;
      const boxCount = results.filter((p: KakoPrediction) => p.winType === 'box').length;
      
      setTotals({
        totalPurchase,
        totalWin,
        profit: totalWin - totalPurchase,
        winCount,
        straightCount,
        boxCount
      });
      
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCsv = () => {
    const headers = ['抽選回', '抽選日', '曜日', '当選番号', 'Kako予想', 'パターン数', '購入口数', '購入金額', '当選タイプ', '当選金額', '収支'];
    const rows = predictions.map((pred) => {
      return [
        pred.drawNumber,
        new Date(pred.drawDate).toLocaleDateString('ja-JP'),
        pred.dayOfWeek,
        pred.winningNumber,
        pred.kakoPrediction,
        pred.patternCount,
        pred.purchaseCount,
        pred.purchaseAmount,
        pred.winType === 'straight' ? 'ストレート' : pred.winType === 'box' ? 'ボックス' : '-',
        pred.winAmount,
        pred.winAmount - pred.purchaseAmount
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
    link.setAttribute('download', `kako_prediction_${period}_${new Date().toISOString().split('T')[0]}.csv`);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">過去の予想結果（Kakoアルゴリズム）</h1>
          {predictions.length > 0 && (
            <button
              onClick={exportToCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              CSVエクスポート
            </button>
          )}
        </div>

        {/* 集計情報 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">総予想回数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{predictions.length}回</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">総当選回数</p>
            <p className="text-2xl font-bold text-green-600">{totals.winCount}回</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">的中率</p>
            <p className="text-2xl font-bold text-blue-600">
              {predictions.length > 0 ? Math.round((totals.winCount / predictions.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">購入総額</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.totalPurchase.toLocaleString()}円</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">当選総額</p>
            <p className="text-2xl font-bold text-green-600">{totals.totalWin.toLocaleString()}円</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">収支</p>
            <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.profit >= 0 ? '+' : ''}{totals.profit.toLocaleString()}円
            </p>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="period-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                期間選択
              </label>
              <select
                id="period-filter"
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">2025年1月～6月 全期間</option>
                <option value="2025-01">2025年1月</option>
                <option value="2025-02">2025年2月</option>
                <option value="2025-03">2025年3月</option>
                <option value="2025-04">2025年4月</option>
                <option value="2025-05">2025年5月</option>
                <option value="2025-06">2025年6月</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="win-filter"
                checked={winOnly}
                onChange={(e) => setWinOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="win-filter" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                当選のみ表示
              </label>
            </div>
          </div>
        </div>

        {/* 予想結果一覧 */}
        {predictions.length > 0 ? (
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {predictions.map((prediction) => (
              <div
                key={`${prediction.drawNumber}`}
                className={`relative rounded-lg shadow-sm p-6 border-l-4 ${
                  prediction.winType === 'straight' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500' :
                  prediction.winType === 'box' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-blue-500' : 
                  'bg-white dark:bg-gray-800 border-gray-300'
                }`}
              >
                {prediction.winType && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full shadow-md animate-pulse">
                    <span className="text-lg">🎉</span>
                    <span className="text-sm font-bold">予想的中！</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        第{prediction.drawNumber}回
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(prediction.drawDate).toLocaleDateString('ja-JP')}（{prediction.dayOfWeek}）
                      </span>
                      {prediction.winType && (
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          prediction.winType === 'straight' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                        }`}>
                          {prediction.winType === 'straight' ? 'ストレート' : 'ボックス'}当選！
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Kako予想:</span>
                          <div className="flex gap-1">
                            {prediction.kakoPrediction.split('').map((digit, index) => (
                              <div key={index} className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center font-mono font-semibold text-sm text-blue-700 dark:text-blue-300">
                                {digit}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">当選番号:</span>
                          <div className="flex gap-1">
                            {prediction.winningNumber.split('').map((digit, index) => (
                              <div key={index} className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-semibold text-sm ${
                                prediction.winType ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
                                {digit}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">パターン数:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{prediction.patternCount}通り</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">購入:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{prediction.purchaseCount}口 ({prediction.purchaseAmount}円)</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                          <span className={`font-medium ${prediction.winAmount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                            {prediction.winAmount.toLocaleString()}円
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-t pt-2">
                          <span className="text-gray-600 dark:text-gray-400">収支:</span>
                          <span className={`font-bold ${
                            prediction.winAmount - prediction.purchaseAmount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {prediction.winAmount - prediction.purchaseAmount >= 0 ? '+' : ''}{(prediction.winAmount - prediction.purchaseAmount).toLocaleString()}円
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPrediction(prediction)}
                    className={`ml-4 text-blue-600 hover:text-blue-800 font-medium ${prediction.winType ? 'mt-8' : ''}`}
                  >
                    詳細
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {isLoading ? '読み込み中...' : '該当する予想履歴がありません'}
            </p>
          </div>
        )}

        {/* 詳細モーダル */}
        {selectedPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  第{selectedPrediction.drawNumber}回 予想詳細
                </h2>
                <button
                  onClick={() => setSelectedPrediction(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">抽選情報</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">抽選日:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {new Date(selectedPrediction.drawDate).toLocaleDateString('ja-JP')}（{selectedPrediction.dayOfWeek}）
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">当選番号:</span>
                        <span className="ml-2 font-mono font-bold text-gray-900 dark:text-white">{selectedPrediction.winningNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Kakoアルゴリズム予想</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="text-gray-600 dark:text-gray-400">基本予想:</span>
                      <span className="ml-2 font-mono font-bold text-lg text-blue-600">{selectedPrediction.kakoPrediction}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">生成パターン数:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedPrediction.patternCount}通り</span>
                    </div>
                    {selectedPrediction.patterns.length <= 24 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">全パターン:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrediction.patterns.map((pattern, index) => (
                            <span key={index} className={`font-mono text-sm px-2 py-1 rounded ${
                              pattern === selectedPrediction.winningNumber 
                                ? 'bg-green-100 text-green-800 font-bold' 
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                            }`}>
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">購入・当選情報</h3>
                  <div className={`rounded-lg p-4 ${
                    selectedPrediction.winType 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入口数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedPrediction.purchaseCount}口</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入金額:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedPrediction.purchaseAmount.toLocaleString()}円</span>
                      </div>
                      {selectedPrediction.winType && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">当選タイプ:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedPrediction.winType === 'straight' ? 'ストレート' : 'ボックス'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                            <span className="font-medium text-green-600">{selectedPrediction.winAmount.toLocaleString()}円</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 dark:text-gray-400">収支:</span>
                        <span className={`font-bold text-lg ${
                          selectedPrediction.winAmount - selectedPrediction.purchaseAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedPrediction.winAmount - selectedPrediction.purchaseAmount >= 0 ? '+' : ''}
                          {(selectedPrediction.winAmount - selectedPrediction.purchaseAmount).toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}