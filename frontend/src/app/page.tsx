'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PastResult {
  drawNumber: number;
  winAmount: string;
  isWinner: boolean;
}

export default function LandingPage() {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  // デモデータ
  const pastResults: PastResult[] = [
    { drawNumber: 643, winAmount: '12,500円', isWinner: true },
    { drawNumber: 642, winAmount: '0円', isWinner: false },
    { drawNumber: 641, winAmount: '8,300円', isWinner: true },
    { drawNumber: 640, winAmount: '0円', isWinner: false },
    { drawNumber: 639, winAmount: '45,000円', isWinner: true },
  ];

  const totalWins = 15;
  const totalWinAmount = '1,234,567円';

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">ナンバーズ4予想AI</h1>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                ログイン
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                無料会員登録
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-12">
        {/* ヒーローセクション */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            AIとデータ分析で、あなたのナンバーズ4を科学する
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            過去データからの統計予想 + AIによる10点予想で当選確率UP！
          </p>
          
          {/* 実績訴求 */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-3xl font-bold text-green-600">過去当選{totalWins}件</p>
              <p className="text-gray-600">直近100回中</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-3xl font-bold text-green-600">合計当選額{totalWinAmount}</p>
              <p className="text-gray-600">過去1年間</p>
            </div>
          </div>
        </section>

        {/* 過去の予想結果サンプル */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            過去の予想実績
          </h3>
          <div className="max-w-2xl mx-auto">
            {pastResults.slice(0, showMore ? pastResults.length : 3).map((result) => (
              <div
                key={result.drawNumber}
                className={`bg-white rounded-lg shadow-sm p-4 mb-4 flex justify-between items-center ${
                  result.isWinner ? 'border-l-4 border-green-500' : ''
                }`}
              >
                <div>
                  <p className="font-medium text-gray-800">第{result.drawNumber}回</p>
                  <p className="text-sm text-gray-600">
                    {result.isWinner ? '当選！' : '残念...'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${result.isWinner ? 'text-green-600' : 'text-gray-500'}`}>
                    {result.winAmount}
                  </p>
                </div>
              </div>
            ))}
            {!showMore && (
              <button
                onClick={() => setShowMore(true)}
                className="w-full text-center text-blue-600 hover:text-blue-800 font-medium py-2"
              >
                もっと見る
              </button>
            )}
          </div>
        </section>

        {/* サービス特徴 */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            なぜ選ばれているのか？
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-3">
                📊 過去データからの統計予想
              </h4>
              <p className="text-gray-600">
                過去100回分の当選番号を分析し、各桁で最も出現頻度の高い数字を抽出。
                統計的に有利な組み合わせを提案します。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-3">
                🤖 AIによる10点予想
              </h4>
              <p className="text-gray-600">
                最新のAI技術で番号の出現パターンを学習。
                従来の統計分析では見つけられない傾向を発見し、精度の高い予想を実現。
              </p>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section className="text-center bg-blue-50 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-gray-800 mb-6">
            今すぐ始めよう
          </h3>
          <div className="space-y-4 mb-8">
            <p className="text-lg text-gray-700">
              ログインして過去の結果を見る
            </p>
            <p className="text-lg text-gray-700">
              会員登録して次回予想を見る
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/register')}
              className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition"
            >
              無料会員登録
            </button>
            <div>
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                既にアカウントをお持ちの方はログイン
              </Link>
            </div>
            <div>
              <Link
                href="/forgot-password"
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                パスワードを忘れた方はこちら
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}