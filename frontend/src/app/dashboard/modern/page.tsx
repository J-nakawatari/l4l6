'use client';

import { useState, useEffect } from 'react';
import ModernDashboardLayout from '@/components/Layout/ModernDashboardLayout';
import dynamic from 'next/dynamic';

// 動的インポートでチャートコンポーネントを読み込む
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Stats {
  totalPredictions: number;
  winRate: number;
  totalWinnings: number;
  activeStreak: number;
}

interface RecentPrediction {
  id: string;
  drawNumber: number;
  date: string;
  numbers: string[];
  status: 'pending' | 'win' | 'lose';
  prize?: number;
}

export default function ModernDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalPredictions: 156,
    winRate: 23.5,
    totalWinnings: 350000,
    activeStreak: 3,
  });

  const [recentPredictions] = useState<RecentPrediction[]>([
    {
      id: '1',
      drawNumber: 1235,
      date: '2024-01-22',
      numbers: ['1234', '5678', '9012'],
      status: 'win',
      prize: 70000,
    },
    {
      id: '2',
      drawNumber: 1234,
      date: '2024-01-15',
      numbers: ['2345', '6789', '0123'],
      status: 'lose',
    },
    {
      id: '3',
      drawNumber: 1233,
      date: '2024-01-08',
      numbers: ['3456', '7890', '1234'],
      status: 'win',
      prize: 140000,
    },
    {
      id: '4',
      drawNumber: 1232,
      date: '2024-01-01',
      numbers: ['4567', '8901', '2345'],
      status: 'pending',
    },
  ]);

  // チャートデータ
  const chartOptions = {
    chart: {
      type: 'area' as const,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
    },
    colors: ['#3b82f6', '#8b5cf6'],
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
  };

  const chartSeries = [
    {
      name: '的中率',
      data: [20, 25, 30, 28, 32, 35],
    },
    {
      name: '予想数',
      data: [15, 18, 22, 25, 28, 30],
    },
  ];

  // 円グラフデータ
  const donutOptions = {
    chart: {
      type: 'donut' as const,
    },
    labels: ['データ分析', 'AI予想', '複合予想'],
    colors: ['#3b82f6', '#8b5cf6', '#10b981'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(0) + '%';
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '総予想数',
              formatter: function () {
                return '156';
              },
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom' as const,
    },
  };

  const donutSeries = [45, 35, 20];

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-label">総予想数</p>
                <p className="stats-value">{stats.totalPredictions}</p>
                <div className="stats-change positive">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stats-card card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-label">的中率</p>
                <p className="stats-value">{stats.winRate}%</p>
                <div className="stats-change positive">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>+5.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stats-card card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-label">総獲得賞金</p>
                <p className="stats-value">¥{stats.totalWinnings.toLocaleString()}</p>
                <div className="stats-change positive">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>+28.4%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stats-card card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-label">連続的中</p>
                <p className="stats-value">{stats.activeStreak}回</p>
                <div className="stats-change positive">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>継続中</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <div className="lg:col-span-2 chart-container">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              予想パフォーマンス推移
            </h3>
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="area"
              height={350}
            />
          </div>

          {/* Donut Chart */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              予想タイプ別分布
            </h3>
            <Chart
              options={donutOptions}
              series={donutSeries}
              type="donut"
              height={350}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Predictions */}
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  最近の予想結果
                </h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  すべて見る
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {recentPredictions.map((prediction) => (
                <div key={prediction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        prediction.status === 'win' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                        prediction.status === 'lose' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {prediction.status === 'win' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : prediction.status === 'lose' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          第{prediction.drawNumber}回
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(prediction.date).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {prediction.prize && (
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          +¥{prediction.prize.toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {prediction.numbers[0]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              クイックアクション
            </h3>
            <div className="space-y-3">
              <button className="w-full btn btn-primary btn-lg justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                次回予想を確認
              </button>
              <button className="w-full btn btn-outline btn-lg justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                予想履歴を見る
              </button>
              <button className="w-full btn btn-outline btn-lg justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                統計分析を表示
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    プロのヒント
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    過去3回の抽選で出現頻度が高い数字を組み合わせると、的中率が向上する傾向があります。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}