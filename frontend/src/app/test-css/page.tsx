export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tailwind CSS テスト
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            カードコンポーネント
          </h2>
          <p className="text-gray-600">
            このカードはTailwind CSSでスタイリングされています。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500 text-white p-4 rounded">
            <h3 className="font-bold">ブルー</h3>
            <p>bg-blue-500</p>
          </div>
          <div className="bg-green-500 text-white p-4 rounded">
            <h3 className="font-bold">グリーン</h3>
            <p>bg-green-500</p>
          </div>
          <div className="bg-red-500 text-white p-4 rounded">
            <h3 className="font-bold">レッド</h3>
            <p>bg-red-500</p>
          </div>
        </div>

        <div className="mt-8">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition">
            プライマリボタン
          </button>
          <button className="ml-4 btn btn-secondary btn-md">
            セカンダリボタン
          </button>
        </div>
      </div>
    </div>
  );
}