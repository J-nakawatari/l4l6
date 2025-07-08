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

interface AIRandomPrediction {
  drawNumber: number;
  drawDate: string;
  dayOfWeek: string;
  winningNumber: string;
  aiRandomPredictions: string[];
  aiRandomWins: Array<{
    prediction: string;
    winType: 'straight' | 'box' | null;
    winAmount: number;
  }>;
  purchaseCount: number;
  purchaseAmount: number;
  totalWinAmount: number;
  prizeInfo: {
    straight?: { amount: number; winners: number };
    box?: { amount: number; winners: number };
  };
}

interface AIPrediction {
  drawNumber: number;
  drawDate: string;
  dayOfWeek: string;
  winningNumber: string;
  aiPredictions: string[];
  aiWins: Array<{
    prediction: string;
    winType: 'straight' | 'box' | null;
    winAmount: number;
  }>;
  purchaseCount: number;
  purchaseAmount: number;
  totalWinAmount: number;
  prizeInfo: {
    straight?: { amount: number; winners: number };
    box?: { amount: number; winners: number };
  };
}

type TabType = 'kako' | 'ai' | 'aiRandom';

export default function PredictionHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('kako');
  const [kakoPredictions, setKakoPredictions] = useState<KakoPrediction[]>([]);
  const [aiPredictions, setAIPredictions] = useState<AIPrediction[]>([]);
  const [aiRandomPredictions, setAIRandomPredictions] = useState<AIRandomPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'2025-01' | '2025-02' | '2025-03' | '2025-04' | '2025-05' | '2025-06' | 'all'>('all');
  const [winOnly, setWinOnly] = useState(false);
  const [selectedKakoPrediction, setSelectedKakoPrediction] = useState<KakoPrediction | null>(null);
  const [selectedAIPrediction, setSelectedAIPrediction] = useState<AIPrediction | null>(null);
  const [selectedAIRandomPrediction, setSelectedAIRandomPrediction] = useState<AIRandomPrediction | null>(null);
  const [kakoTotals, setKakoTotals] = useState({
    totalPurchase: 0,
    totalWin: 0,
    profit: 0,
    winCount: 0,
    straightCount: 0,
    boxCount: 0
  });
  const [aiTotals, setAITotals] = useState({
    totalPurchase: 0,
    totalWin: 0,
    profit: 0,
    winCount: 0,
    straightCount: 0,
    boxCount: 0
  });
  const [aiRandomTotals, setAIRandomTotals] = useState({
    totalPurchase: 0,
    totalWin: 0,
    profit: 0,
    winCount: 0,
    straightCount: 0,
    boxCount: 0
  });

  useEffect(() => {
    fetchPredictions();
  }, [period]);

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

      // Fetch both original predictions and AI Random predictions
      const [response, aiRandomResponse] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/draw-results/history-with-all-predictions?startDate=${startDate}&endDate=${endDate}`,
          {
            credentials: 'include',
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/draw-results/history-with-ai-random-period?startDate=${startDate}&endDate=${endDate}`,
          {
            credentials: 'include',
          }
        )
      ]);

      if (!response.ok || !aiRandomResponse.ok) {
        if (response.status === 401 || aiRandomResponse.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch predictions');
      }

      const data = await response.json();
      const aiRandomData = await aiRandomResponse.json();
      
      setKakoPredictions(data.kakoResults || []);
      setAIPredictions(data.aiResults || []);
      setAIRandomPredictions(aiRandomData.results || []);
      
      // Kako集計計算
      const kakoTotalPurchase = data.kakoResults.reduce((sum: number, p: KakoPrediction) => sum + p.purchaseAmount, 0);
      const kakoTotalWin = data.kakoResults.reduce((sum: number, p: KakoPrediction) => sum + p.winAmount, 0);
      const kakoWinCount = data.kakoResults.filter((p: KakoPrediction) => p.winType !== null).length;
      const kakoStraightCount = data.kakoResults.filter((p: KakoPrediction) => p.winType === 'straight').length;
      const kakoBoxCount = data.kakoResults.filter((p: KakoPrediction) => p.winType === 'box').length;
      
      setKakoTotals({
        totalPurchase: kakoTotalPurchase,
        totalWin: kakoTotalWin,
        profit: kakoTotalWin - kakoTotalPurchase,
        winCount: kakoWinCount,
        straightCount: kakoStraightCount,
        boxCount: kakoBoxCount
      });
      
      // AI集計計算
      const aiTotalPurchase = data.aiResults.reduce((sum: number, p: AIPrediction) => sum + p.purchaseAmount, 0);
      const aiTotalWin = data.aiResults.reduce((sum: number, p: AIPrediction) => sum + p.totalWinAmount, 0);
      const aiWinCount = data.aiResults.filter((p: AIPrediction) => p.aiWins.some(w => w.winType !== null)).length;
      const aiStraightCount = data.aiResults.reduce((sum: number, p: AIPrediction) => 
        sum + p.aiWins.filter(w => w.winType === 'straight').length, 0);
      const aiBoxCount = data.aiResults.reduce((sum: number, p: AIPrediction) => 
        sum + p.aiWins.filter(w => w.winType === 'box').length, 0);
      
      setAITotals({
        totalPurchase: aiTotalPurchase,
        totalWin: aiTotalWin,
        profit: aiTotalWin - aiTotalPurchase,
        winCount: aiWinCount,
        straightCount: aiStraightCount,
        boxCount: aiBoxCount
      });
      
      // AI Random集計計算
      const aiRandomTotalPurchase = aiRandomData.results.reduce((sum: number, p: AIRandomPrediction) => sum + p.purchaseAmount, 0);
      const aiRandomTotalWin = aiRandomData.results.reduce((sum: number, p: AIRandomPrediction) => sum + p.totalWinAmount, 0);
      const aiRandomWinCount = aiRandomData.results.filter((p: AIRandomPrediction) => p.aiRandomWins.some(w => w.winType !== null)).length;
      const aiRandomStraightCount = aiRandomData.results.reduce((sum: number, p: AIRandomPrediction) => 
        sum + p.aiRandomWins.filter(w => w.winType === 'straight').length, 0);
      const aiRandomBoxCount = aiRandomData.results.reduce((sum: number, p: AIRandomPrediction) => 
        sum + p.aiRandomWins.filter(w => w.winType === 'box').length, 0);
      
      setAIRandomTotals({
        totalPurchase: aiRandomTotalPurchase,
        totalWin: aiRandomTotalWin,
        profit: aiRandomTotalWin - aiRandomTotalPurchase,
        winCount: aiRandomWinCount,
        straightCount: aiRandomStraightCount,
        boxCount: aiRandomBoxCount
      });
      
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredPredictions = () => {
    if (activeTab === 'kako') {
      return winOnly ? kakoPredictions.filter(p => p.winType !== null) : kakoPredictions;
    } else if (activeTab === 'ai') {
      return winOnly ? aiPredictions.filter(p => p.aiWins.some(w => w.winType !== null)) : aiPredictions;
    } else {
      return winOnly ? aiRandomPredictions.filter(p => p.aiRandomWins.some(w => w.winType !== null)) : aiRandomPredictions;
    }
  };

  const exportToCsv = () => {
    if (activeTab === 'kako') {
      const headers = ['抽選回', '抽選日', '曜日', '当選番号', 'Kako予想', 'パターン数', '購入口数', '購入金額', '当選タイプ', '当選金額', '収支'];
      const rows = kakoPredictions.map((pred) => {
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
    } else if (activeTab === 'ai') {
      const headers = ['抽選回', '抽選日', '曜日', '当選番号', 'AI予想1', 'AI予想2', 'AI予想3', 'AI予想4', 'AI予想5', 'AI予想6', '購入金額', '当選金額', '収支'];
      const rows = aiPredictions.map((pred) => {
        return [
          pred.drawNumber,
          new Date(pred.drawDate).toLocaleDateString('ja-JP'),
          pred.dayOfWeek,
          pred.winningNumber,
          ...pred.aiPredictions.slice(0, 6),
          ...Array(6 - pred.aiPredictions.length).fill('-'),
          pred.purchaseAmount,
          pred.totalWinAmount,
          pred.totalWinAmount - pred.purchaseAmount
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
      link.setAttribute('download', `ai_prediction_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['抽選回', '抽選日', '曜日', '当選番号', ...Array.from({length: 12}, (_, i) => `AIランダム${i+1}`), '購入金額', '当選金額', '収支'];
      const rows = aiRandomPredictions.map((pred) => {
        return [
          pred.drawNumber,
          new Date(pred.drawDate).toLocaleDateString('ja-JP'),
          pred.dayOfWeek,
          pred.winningNumber,
          ...pred.aiRandomPredictions.slice(0, 12),
          ...Array(12 - pred.aiRandomPredictions.length).fill('-'),
          pred.purchaseAmount,
          pred.totalWinAmount,
          pred.totalWinAmount - pred.purchaseAmount
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
      link.setAttribute('download', `ai_random_prediction_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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

  const filteredPredictions = getFilteredPredictions();
  const currentTotals = activeTab === 'kako' ? kakoTotals : activeTab === 'ai' ? aiTotals : aiRandomTotals;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">過去の予想結果</h1>
          {filteredPredictions.length > 0 && (
            <button
              onClick={exportToCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              CSVエクスポート
            </button>
          )}
        </div>

        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('kako')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'kako'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Kakoアルゴリズム
            {activeTab === 'kako' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'ai'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            AI予想
            {activeTab === 'ai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('aiRandom')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'aiRandom'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            AIランダム予想
            {activeTab === 'aiRandom' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* 集計情報 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">総予想回数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPredictions.length}回</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">総当選回数</p>
            <p className="text-2xl font-bold text-green-600">{currentTotals.winCount}回</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">的中率</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredPredictions.length > 0 ? Math.round((currentTotals.winCount / filteredPredictions.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">購入総額</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentTotals.totalPurchase.toLocaleString()}円</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">当選総額</p>
            <p className="text-2xl font-bold text-green-600">{currentTotals.totalWin.toLocaleString()}円</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">収支</p>
            <p className={`text-2xl font-bold ${currentTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentTotals.profit >= 0 ? '+' : ''}{currentTotals.profit.toLocaleString()}円
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
        {filteredPredictions.length > 0 ? (
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {activeTab === 'kako' ? (
              // Kako予想の表示
              (winOnly ? kakoPredictions.filter(p => p.winType !== null) : kakoPredictions).map((prediction) => (
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
                      onClick={() => setSelectedKakoPrediction(prediction)}
                      className={`ml-4 text-blue-600 hover:text-blue-800 font-medium ${prediction.winType ? 'mt-8' : ''}`}
                    >
                      詳細
                    </button>
                  </div>
                </div>
              ))
            ) : activeTab === 'ai' ? (
              // AI予想の表示
              (winOnly ? aiPredictions.filter(p => p.aiWins.some(w => w.winType !== null)) : aiPredictions).map((prediction) => {
                const hasWin = prediction.aiWins.some(w => w.winType !== null);
                const straightWins = prediction.aiWins.filter(w => w.winType === 'straight');
                const boxWins = prediction.aiWins.filter(w => w.winType === 'box');
                
                return (
                  <div
                    key={`${prediction.drawNumber}`}
                    className={`relative rounded-lg shadow-sm p-6 border-l-4 ${
                      hasWin ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500' : 
                      'bg-white dark:bg-gray-800 border-gray-300'
                    }`}
                  >
                    {hasWin && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white px-3 py-1 rounded-full shadow-md animate-pulse">
                        <span className="text-lg">🎉</span>
                        <span className="text-sm font-bold">AI予想的中！</span>
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
                          {straightWins.length > 0 && (
                            <span className="text-sm font-medium px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                              ストレート {straightWins.length}本
                            </span>
                          )}
                          {boxWins.length > 0 && (
                            <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100">
                              ボックス {boxWins.length}本
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">当選番号:</span>
                            <div className="flex gap-1">
                              {prediction.winningNumber.split('').map((digit, index) => (
                                <div key={index} className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center font-mono font-semibold text-sm text-green-700 dark:text-green-300">
                                  {digit}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          {prediction.aiWins.map((win, index) => (
                            <div key={index} className={`p-3 rounded-lg ${
                              win.winType ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20' : 
                              'bg-gray-50 dark:bg-gray-700'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">AI予想 {index + 1}</span>
                                {win.winType && (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    win.winType === 'straight' 
                                      ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' 
                                      : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                  }`}>
                                    {win.winType === 'straight' ? 'ストレート' : 'ボックス'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 mb-1">
                                {win.prediction.split('').map((digit, dIndex) => (
                                  <div key={dIndex} className={`w-7 h-7 rounded flex items-center justify-center font-mono font-semibold text-xs ${
                                    win.winType ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200' : 
                                    'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {digit}
                                  </div>
                                ))}
                              </div>
                              {win.winAmount > 0 && (
                                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                                  +{win.winAmount.toLocaleString()}円
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-sm border-t pt-3">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">購入:</span>
                            <span className="font-medium text-gray-900 dark:text-white ml-1">
                              {prediction.purchaseCount}口 ({prediction.purchaseAmount.toLocaleString()}円)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                            <span className={`font-medium ml-1 ${prediction.totalWinAmount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                              {prediction.totalWinAmount.toLocaleString()}円
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">収支:</span>
                            <span className={`font-bold ml-1 ${
                              prediction.totalWinAmount - prediction.purchaseAmount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {prediction.totalWinAmount - prediction.purchaseAmount >= 0 ? '+' : ''}
                              {(prediction.totalWinAmount - prediction.purchaseAmount).toLocaleString()}円
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedAIPrediction(prediction)}
                        className={`ml-4 text-purple-600 hover:text-purple-800 font-medium ${hasWin ? 'mt-8' : ''}`}
                      >
                        詳細
                      </button>
                    </div>
                  </div>
                );
              })
            ) : activeTab === 'aiRandom' ? (
              // AIランダム予想の表示
              (winOnly ? aiRandomPredictions.filter(p => p.aiRandomWins.some(w => w.winType !== null)) : aiRandomPredictions).map((prediction) => {
                const wins = prediction.aiRandomWins.filter(w => w.winType !== null);
                const hasWin = wins.length > 0;
                const straightWins = wins.filter(w => w.winType === 'straight');
                const boxWins = wins.filter(w => w.winType === 'box');
                
                return (
                  <div
                    key={`${prediction.drawNumber}`}
                    className={`relative rounded-lg shadow-sm p-6 border-l-4 ${
                      hasWin ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500' : 
                      'bg-white dark:bg-gray-800 border-gray-300'
                    }`}
                  >
                    {hasWin && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-400 text-white px-3 py-1 rounded-full shadow-md animate-pulse">
                        <span className="text-lg">🎉</span>
                        <span className="text-sm font-bold">AIランダム的中！</span>
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
                          {straightWins.length > 0 && (
                            <span className="text-sm font-medium px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                              ストレート {straightWins.length}本
                            </span>
                          )}
                          {boxWins.length > 0 && (
                            <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100">
                              ボックス {boxWins.length}本
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">当選番号:</span>
                            <div className="flex gap-1">
                              {prediction.winningNumber.split('').map((digit, index) => (
                                <div key={index} className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center font-mono font-semibold text-sm text-green-700 dark:text-green-300">
                                  {digit}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                          {prediction.aiRandomWins.map((win, index) => (
                            <div key={index} className={`p-2 rounded-lg ${
                              win.winType ? 'bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20' : 
                              'bg-gray-50 dark:bg-gray-700'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">ランダム {index + 1}</span>
                                {win.winType && (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                    win.winType === 'straight' 
                                      ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' 
                                      : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                  }`}>
                                    {win.winType === 'straight' ? 'S' : 'B'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-0.5 mb-1">
                                {win.prediction.split('').map((digit, dIndex) => (
                                  <div key={dIndex} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-mono font-semibold ${
                                    win.winType ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' : 
                                    'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {digit}
                                  </div>
                                ))}
                              </div>
                              {win.winAmount > 0 && (
                                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                                  +{(win.winAmount / 1000).toFixed(0)}k
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-sm border-t pt-3">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">購入:</span>
                            <span className="font-medium text-gray-900 dark:text-white ml-1">
                              {prediction.purchaseCount}予想 ({prediction.purchaseAmount.toLocaleString()}円)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                            <span className={`font-medium ml-1 ${prediction.totalWinAmount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                              {prediction.totalWinAmount.toLocaleString()}円
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">収支:</span>
                            <span className={`font-bold ml-1 ${
                              prediction.totalWinAmount - prediction.purchaseAmount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {prediction.totalWinAmount - prediction.purchaseAmount >= 0 ? '+' : ''}{(prediction.totalWinAmount - prediction.purchaseAmount).toLocaleString()}円
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedAIRandomPrediction(prediction)}
                        className={`ml-4 text-blue-600 hover:text-blue-800 font-medium ${hasWin ? 'mt-8' : ''}`}
                      >
                        詳細
                      </button>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {isLoading ? '読み込み中...' : '該当する予想履歴がありません'}
            </p>
          </div>
        )}

        {/* Kako詳細モーダル */}
        {selectedKakoPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  第{selectedKakoPrediction.drawNumber}回 Kako予想詳細
                </h2>
                <button
                  onClick={() => setSelectedKakoPrediction(null)}
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
                          {new Date(selectedKakoPrediction.drawDate).toLocaleDateString('ja-JP')}（{selectedKakoPrediction.dayOfWeek}）
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">当選番号:</span>
                        <span className="ml-2 font-mono font-bold text-gray-900 dark:text-white">{selectedKakoPrediction.winningNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Kakoアルゴリズム予想</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="text-gray-600 dark:text-gray-400">基本予想:</span>
                      <span className="ml-2 font-mono font-bold text-lg text-blue-600">{selectedKakoPrediction.kakoPrediction}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">生成パターン数:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedKakoPrediction.patternCount}通り</span>
                    </div>
                    {selectedKakoPrediction.patterns.length <= 24 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">全パターン:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedKakoPrediction.patterns.map((pattern, index) => (
                            <span key={index} className={`font-mono text-sm px-2 py-1 rounded ${
                              pattern === selectedKakoPrediction.winningNumber 
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
                    selectedKakoPrediction.winType 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入口数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedKakoPrediction.purchaseCount}口</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入金額:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedKakoPrediction.purchaseAmount.toLocaleString()}円</span>
                      </div>
                      {selectedKakoPrediction.winType && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">当選タイプ:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedKakoPrediction.winType === 'straight' ? 'ストレート' : 'ボックス'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                            <span className="font-medium text-green-600">{selectedKakoPrediction.winAmount.toLocaleString()}円</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 dark:text-gray-400">収支:</span>
                        <span className={`font-bold text-lg ${
                          selectedKakoPrediction.winAmount - selectedKakoPrediction.purchaseAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedKakoPrediction.winAmount - selectedKakoPrediction.purchaseAmount >= 0 ? '+' : ''}
                          {(selectedKakoPrediction.winAmount - selectedKakoPrediction.purchaseAmount).toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI詳細モーダル */}
        {selectedAIPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  第{selectedAIPrediction.drawNumber}回 AI予想詳細
                </h2>
                <button
                  onClick={() => setSelectedAIPrediction(null)}
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
                          {new Date(selectedAIPrediction.drawDate).toLocaleDateString('ja-JP')}（{selectedAIPrediction.dayOfWeek}）
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">当選番号:</span>
                        <span className="ml-2 font-mono font-bold text-gray-900 dark:text-white">{selectedAIPrediction.winningNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI予想一覧</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAIPrediction.aiWins.map((win, index) => (
                      <div key={index} className={`rounded-lg p-4 ${
                        win.winType 
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700' 
                          : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI予想 {index + 1}</span>
                          {win.winType && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              win.winType === 'straight' 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            }`}>
                              {win.winType === 'straight' ? 'ストレート当選' : 'ボックス当選'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mb-3">
                          {win.prediction.split('').map((digit, dIndex) => (
                            <div key={dIndex} className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                              win.winType 
                                ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200' 
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {digit}
                            </div>
                          ))}
                        </div>
                        {win.winAmount > 0 && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            当選金額: {win.winAmount.toLocaleString()}円
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">購入・当選情報</h3>
                  <div className={`rounded-lg p-4 ${
                    selectedAIPrediction.totalWinAmount > 0 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">予想数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedAIPrediction.aiPredictions.length}個</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入口数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedAIPrediction.purchaseCount}口</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入金額:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedAIPrediction.purchaseAmount.toLocaleString()}円</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">当選数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedAIPrediction.aiWins.filter(w => w.winType !== null).length}個
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">当選金額合計:</span>
                        <span className="font-medium text-green-600">{selectedAIPrediction.totalWinAmount.toLocaleString()}円</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 dark:text-gray-400">収支:</span>
                        <span className={`font-bold text-lg ${
                          selectedAIPrediction.totalWinAmount - selectedAIPrediction.purchaseAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedAIPrediction.totalWinAmount - selectedAIPrediction.purchaseAmount >= 0 ? '+' : ''}
                          {(selectedAIPrediction.totalWinAmount - selectedAIPrediction.purchaseAmount).toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AIランダム詳細モーダル */}
        {selectedAIRandomPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  第{selectedAIRandomPrediction.drawNumber}回 AIランダム予想詳細
                </h2>
                <button
                  onClick={() => setSelectedAIRandomPrediction(null)}
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
                          {new Date(selectedAIRandomPrediction.drawDate).toLocaleDateString('ja-JP')}（{selectedAIRandomPrediction.dayOfWeek}）
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">当選番号:</span>
                        <span className="ml-2 font-mono font-bold text-gray-900 dark:text-white">{selectedAIRandomPrediction.winningNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AIランダム予想一覧（12個）</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {selectedAIRandomPrediction.aiRandomWins.map((win, index) => (
                      <div key={index} className={`rounded-lg p-3 ${
                        win.winType 
                          ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-700' 
                          : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ランダム {index + 1}</span>
                          {win.winType && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              win.winType === 'straight' 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            }`}>
                              {win.winType === 'straight' ? 'ストレート' : 'ボックス'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mb-2">
                          {win.prediction.split('').map((digit, dIndex) => (
                            <div key={dIndex} className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                              win.winType 
                                ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' 
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {digit}
                            </div>
                          ))}
                        </div>
                        {win.winAmount > 0 && (
                          <div className="text-xs font-medium text-green-600 dark:text-green-400">
                            +{win.winAmount.toLocaleString()}円
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">購入・当選情報</h3>
                  <div className={`rounded-lg p-4 ${
                    selectedAIRandomPrediction.totalWinAmount > 0 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">予想数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">12個</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">購入金額:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedAIRandomPrediction.purchaseAmount.toLocaleString()}円</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">当選本数:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedAIRandomPrediction.aiRandomWins.filter(w => w.winType !== null).length}本
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">当選金額:</span>
                        <span className="font-medium text-green-600">{selectedAIRandomPrediction.totalWinAmount.toLocaleString()}円</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 dark:text-gray-400">収支:</span>
                        <span className={`font-bold text-lg ${
                          selectedAIRandomPrediction.totalWinAmount - selectedAIRandomPrediction.purchaseAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedAIRandomPrediction.totalWinAmount - selectedAIRandomPrediction.purchaseAmount >= 0 ? '+' : ''}
                          {(selectedAIRandomPrediction.totalWinAmount - selectedAIRandomPrediction.purchaseAmount).toLocaleString()}円
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