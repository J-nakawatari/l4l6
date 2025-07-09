'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N4</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Numbers4 AI予想</h1>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
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
          <h2 className="text-5xl font-bold text-gray-800 dark:text-white mb-6 leading-tight">
            データが語る、明日の数字
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            過去100回分のデータから導き出す、4つの独自アルゴリズムで
            <br />
            ナンバーズ4の次回予想を提示します
          </p>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              今すぐ予想を見る
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-lg font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              デモを見る
            </button>
          </div>
        </section>

        {/* アルゴリズム説明セクション */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-12 text-center">
            データサイエンスで紐解く、ナンバーズ4の隠れたパターン
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* 遷移確率分析 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    遷移確率分析
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    前回の当選番号から「次に来やすい数字」を確率計算。
                    過去のデータが示す数字の流れを読み解きます。
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  例：位置1で「3」の後に「8」が21.4%の確率で出現
                </p>
              </div>
            </div>

            {/* 位置相関マッピング */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔗</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    位置相関マッピング
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    千の位が「0」の時、一の位は「5」が多い？
                    4つの位置の相関関係を可視化し、見えない繋がりを発見。
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  例：位置1が「0」の時、位置4が「5」になる確率3.45%
                </p>
              </div>
            </div>

            {/* パターン統計解析 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📈</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    パターン統計解析
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    連続数字、ペア、合計値、奇数偶数の配分...
                    当選番号に潜む統計的特徴を多角的に分析。
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  例：連続する数字を含む当選番号は67.67%
                </p>
              </div>
            </div>

            {/* AIハイブリッド予想 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    AIハイブリッド予想
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    3つの分析手法を組み合わせ、6つの有力候補を提示。
                    単一の手法では見逃す可能性も、複合的にカバー。
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  各アルゴリズムの予測を統合し、最適な組み合わせを生成
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="mb-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-12">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-center">
            100回の過去が示す、1回の未来
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">100回分</div>
              <p className="text-gray-600 dark:text-gray-300">過去データを分析</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">4つの</div>
              <p className="text-gray-600 dark:text-gray-300">独自アルゴリズム</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">9つの</div>
              <p className="text-gray-600 dark:text-gray-300">予想数字を提示</p>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section className="text-center">
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            統計が導く、次の4桁
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            会員登録してAIが予想する次回の数字を確認しましょう
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/register')}
              className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              無料で予想を見る
            </button>
            <div>
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                既にアカウントをお持ちの方はログイン
              </Link>
            </div>
          </div>
        </section>

        {/* 免責事項 */}
        <div className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>※ これらの予想は過去のデータを分析したアルゴリズムによるものです</p>
          <p>※ 宝くじは偶然性のゲームであり、当選を保証するものではありません</p>
        </div>
      </div>
    </main>
  );
}