'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const algorithms = [
    {
      name: "ベイジアン・マルコフ・チェーン解析",
      icon: "🧮",
      formula: "P(X_{n+1}|X_n) = ∫ P(X_{n+1}|θ)P(θ|X_n)dθ",
      description: "確率状態空間における遷移パターンの量子レベル解析",
      complexity: "O(n³ log n)"
    },
    {
      name: "多次元クロス・コリレーション・マトリックス",
      icon: "🔗",
      formula: "R_{xy}(τ) = E[(X_t - μ_x)(Y_{t+τ} - μ_y)]",
      description: "4次元空間における非線形相関係数の特異値分解",
      complexity: "O(n⁴)"
    },
    {
      name: "フーリエ変換パターン・レコグニション",
      icon: "📊",
      formula: "F(ω) = ∫_{-∞}^{∞} f(t)e^{-iωt}dt",
      description: "周波数領域でのパターン抽出と逆変換による予測",
      complexity: "O(n log n)"
    },
    {
      name: "深層学習ニューラルネットワーク統合解析",
      icon: "🤖",
      formula: "y = σ(W_n ∘ σ(W_{n-1} ∘ ... ∘ σ(W_1x + b_1) + b_{n-1}) + b_n)",
      description: "多層パーセプトロンによる非線形回帰とアンサンブル学習",
      complexity: "O(2^n)"
    }
  ];

  const processingSteps = [
    "量子ビット初期化中...",
    "データマイニング実行中...",
    "機械学習モデル訓練中...",
    "統計的有意性検証中...",
    "ニューラルネットワーク最適化中...",
    "予測モデル統合中..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % algorithms.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const startProcessing = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 6000);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Numbers4 AI予想</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition"
            >
              ログイン
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              無料会員登録
            </button>
          </div>
        </div>
      </header>

      {/* メインビジュアル */}
      <section className="bg-blue-500 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="inline-block animate-bounce">
              <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-6">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                <circle cx="60" cy="60" r="40" fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="3"/>
                <text x="60" y="70" textAnchor="middle" className="fill-white text-2xl font-bold">AI</text>
              </svg>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold mb-6">
            データが語る、明日の数字
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            4つの高度アルゴリズムが過去100回分のデータを解析<br/>
            複雑な統計計算をあなたの代わりに実行します
          </p>
          
          {/* 予想数字表示 */}
          <div className="bg-white text-gray-800 rounded-2xl p-8 mb-8 max-w-md mx-auto border-2 border-blue-500">
            <p className="text-sm mb-4 text-gray-600">AI予想 次回数字</p>
            <div className="text-6xl font-black text-blue-800">1 2 3 4</div>
            <p className="text-xs mt-4 text-gray-500">※ 会員登録で最新予想を確認</p>
          </div>
          
          <button
            onClick={() => router.push('/register')}
            className="bg-yellow-400 text-gray-800 px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-500 transition"
          >
            今すぐ予想を見る
          </button>
        </div>
      </section>

      {/* 問題提起セクション */}
      <section className="bg-yellow-400 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-4">
            Do you have any problem?
          </h2>
          <p className="text-center text-white mb-16">ナンバーズ4でこんなお悩みありませんか？</p>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="mb-6">
                <svg width="80" height="80" className="mx-auto" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="#fef3c7"/>
                  <path d="M25 45 L35 55 L55 25" stroke="#f59e0b" strokeWidth="3" fill="none"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">数字選びに時間がかかる</h3>
              <p className="text-gray-600">毎回どの数字を選べばいいか迷って、決めるだけで30分以上...</p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="mb-6">
                <svg width="80" height="80" className="mx-auto" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="#dbeafe"/>
                  <path d="M30 30 h20 v20 h-20 z" fill="#3b82f6"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">過去データの分析が大変</h3>
              <p className="text-gray-600">統計を調べるのは面倒だし、何を基準に選べばいいかわからない...</p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="mb-6">
                <svg width="80" height="80" className="mx-auto" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="#fce7f3"/>
                  <path d="M25 35 Q40 20 55 35 Q40 50 25 35" fill="#ec4899"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">感覚だけで選んでいる</h3>
              <p className="text-gray-600">いつも勘に頼って数字を選んでしまい、根拠がない...</p>
            </div>
          </div>
        </div>
      </section>

      {/* サービス紹介 */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Numbers4 AI予想</h2>
            <p className="text-xl text-gray-600">高度な数学的手法があなたの代わりに最適解を計算</p>
          </div>
          
          <div className="bg-white rounded-3xl p-12 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6 text-gray-800">
                  複雑な統計計算を<br/>
                  <span className="text-blue-500">3秒で完了</span>
                </h3>
                <p className="text-gray-600 mb-8">
                  あなたが何時間もかけて行う分析作業を、AIが瞬時に実行。
                  ベイジアン統計、機械学習、フーリエ解析など、最先端の数学的手法を組み合わせた予想システムです。
                </p>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">過去100回分のデータを全自動解析</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">4つの独自アルゴリズムで多角的予想</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">統計的根拠に基づいた数字選択</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="animate-bounce">
                  <svg width="300" height="200" viewBox="0 0 300 200">
                    <rect x="20" y="20" width="260" height="160" rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
                    <rect x="40" y="40" width="220" height="20" rx="10" fill="#3b82f6"/>
                    <rect x="40" y="80" width="180" height="20" rx="10" fill="#8b5cf6"/>
                    <rect x="40" y="120" width="200" height="20" rx="10" fill="#06b6d4"/>
                    <text x="150" y="175" textAnchor="middle" className="fill-gray-600 text-sm">AI解析中...</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4つのサービス */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Service</h2>
          
          <div className="space-y-16">
            {algorithms.map((algo, index) => (
              <div key={index} className={`grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:grid-flow-col-dense' : ''}`}>
                <div className={index % 2 === 1 ? 'md:col-start-2' : ''}>
                  <div className={`bg-${['blue', 'purple', 'green', 'yellow'][index]}-100 text-${['blue', 'purple', 'green', 'yellow'][index]}-800 px-4 py-2 rounded-full inline-block mb-4`}>
                    0{index + 1} {algo.name}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-800">{algo.description}</h3>
                  <p className="text-gray-600 mb-6">
                    {index === 0 && "前回の当選番号から「次に来やすい数字」を高度な確率論で計算。単純な出現頻度ではなく、数字間の遷移パターンを量子力学的手法で解析します。"}
                    {index === 1 && "千の位、百の位、十の位、一の位の相関関係を多次元ベクトル空間で解析。人間では発見できない複雑な数字の組み合わせパターンをAIが発見します。"}
                    {index === 2 && "当選番号を周波数領域に変換し、時系列では見えない周期的パターンを発見。数学の最高峰であるフーリエ解析により、未来の数字を予測します。"}
                    {index === 3 && "3つの分析結果をニューラルネットワークで統合し、最終的な予想数字を生成。人工知能が人間の直感を超えた最適解を導き出します。"}
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    {algo.formula}
                  </div>
                </div>
                <div className={`text-center ${index % 2 === 1 ? 'md:col-start-1' : ''}`}>
                  <div className="animate-bounce">
                    <svg width="250" height="200" viewBox="0 0 250 200">
                      {index === 0 && (
                        <>
                          <circle cx="125" cy="100" r="80" fill="#dbeafe" opacity="0.5"/>
                          <circle cx="125" cy="100" r="60" fill="#3b82f6" opacity="0.3"/>
                          <circle cx="125" cy="100" r="40" fill="#1d4ed8" opacity="0.5"/>
                          <text x="125" y="110" textAnchor="middle" className="fill-white text-lg font-bold">統計解析</text>
                        </>
                      )}
                      {index === 1 && (
                        <>
                          <rect x="25" y="50" width="200" height="100" rx="15" fill="#f3e8ff"/>
                          <rect x="50" y="70" width="30" height="60" fill="#8b5cf6"/>
                          <rect x="100" y="80" width="30" height="50" fill="#a855f7"/>
                          <rect x="150" y="60" width="30" height="70" fill="#9333ea"/>
                          <text x="125" y="180" textAnchor="middle" className="fill-gray-600 text-sm">相関解析</text>
                        </>
                      )}
                      {index === 2 && (
                        <>
                          <path d="M25 100 Q75 50 125 100 T225 100" stroke="#10b981" strokeWidth="4" fill="none"/>
                          <path d="M25 120 Q75 80 125 120 T225 120" stroke="#059669" strokeWidth="3" fill="none"/>
                          <path d="M25 140 Q75 110 125 140 T225 140" stroke="#047857" strokeWidth="2" fill="none"/>
                          <text x="125" y="180" textAnchor="middle" className="fill-gray-600 text-sm">波形解析</text>
                        </>
                      )}
                      {index === 3 && (
                        <>
                          <circle cx="125" cy="60" r="15" fill="#f59e0b"/>
                          <circle cx="80" cy="100" r="12" fill="#d97706"/>
                          <circle cx="170" cy="100" r="12" fill="#d97706"/>
                          <circle cx="60" cy="140" r="10" fill="#b45309"/>
                          <circle cx="125" cy="140" r="10" fill="#b45309"/>
                          <circle cx="190" cy="140" r="10" fill="#b45309"/>
                          <path d="M125 75 L80 88" stroke="#374151" strokeWidth="2"/>
                          <path d="M125 75 L170 88" stroke="#374151" strokeWidth="2"/>
                          <path d="M80 112 L60 128" stroke="#374151" strokeWidth="2"/>
                          <path d="M170 112 L190 128" stroke="#374151" strokeWidth="2"/>
                          <text x="125" y="180" textAnchor="middle" className="fill-gray-600 text-sm">Neural Network</text>
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 実績セクション */}
      <section className="bg-blue-500 py-20 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-16">100回の過去が示す、1回の未来</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white text-gray-800 rounded-xl p-8">
              <div className="text-5xl font-bold mb-4 text-blue-600">100</div>
              <p className="text-xl">過去データを分析</p>
            </div>
            <div className="bg-white text-gray-800 rounded-xl p-8">
              <div className="text-5xl font-bold mb-4 text-blue-600">4</div>
              <p className="text-xl">独自アルゴリズム</p>
            </div>
            <div className="bg-white text-gray-800 rounded-xl p-8">
              <div className="text-5xl font-bold mb-4 text-blue-600">15</div>
              <p className="text-xl">予想数字を提示</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-yellow-400 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">統計が導く、次の4桁</h2>
          <p className="text-xl text-white mb-12">会員登録してAIが予想する次回の数字を確認しましょう</p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/register')}
              className="bg-white text-gray-800 px-12 py-4 rounded-lg text-xl font-bold hover:bg-gray-100 transition block mx-auto"
            >
              無料で予想を見る
            </button>
            <p className="text-white">
              <Link href="/login" className="underline hover:no-underline">
                既にアカウントをお持ちの方はログイン
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* 注意書き */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
          <p>※ これらの予想は過去のデータを分析したアルゴリズムによるものです</p>
          <p>※ 宝くじは偶然性のゲームであり、当選を保証するものではありません</p>
        </div>
      </footer>
    </main>
  );
}
