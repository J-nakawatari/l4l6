# ロト当選番号予想サイト実装計画書

## 1. プロジェクト概要

### 1.1 サービス概要
- **目的**: 過去データとAIを活用したロト当選番号予想サービス
- **ターゲット**: ロト購入者、データ分析に興味がある人
- **収益モデル**: サブスクリプション（月額制）

### 1.2 主要機能
1. **無料会員**: 過去の予想結果閲覧
2. **有料会員**: 次回予想の閲覧（データロジック + AI予想）
3. **管理者**: ユーザー管理、予想管理、実績分析

## 2. システムアーキテクチャ

### 2.1 技術スタック
```
┌─────────────────────────────────────────────────────┐
│                   フロントエンド                      │
│  ┌─────────────────┐    ┌─────────────────────┐   │
│  │ ユーザーサイト    │    │  管理者ダッシュボード  │   │
│  │   (Next.js)     │    │    (Next.js)        │   │
│  └─────────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                    API層                            │
│  ┌─────────────────┐    ┌─────────────────────┐   │
│  │ ユーザーAPI     │    │    管理API          │   │
│  │ /api/v1/users/* │    │ /api/v1/admin/*     │   │
│  └─────────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                  サービス層                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │認証サービス│ │予想サービス│ │決済サービス(Stripe)│  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│               データベース層                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ MongoDB  │ │  Redis   │ │  外部API        │  │
│  │          │ │ (Cache)  │ │ (ロト公式)      │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.2 ディレクトリ構造
```
l4l6/
├── frontend/               # ユーザー向けNext.jsアプリ
│   ├── pages/
│   │   ├── index.tsx      # ランディングページ
│   │   ├── dashboard.tsx  # ダッシュボード
│   │   ├── auth/          # 認証関連ページ
│   │   └── subscribe/     # 決済関連ページ
│   └── components/
├── admin/                  # 管理者向けNext.jsアプリ
│   ├── pages/
│   │   ├── index.tsx      # 管理ダッシュボード
│   │   ├── users/         # ユーザー管理
│   │   ├── predictions/   # 予想管理
│   │   └── analytics/     # 分析・統計
│   └── components/
├── backend/               # Express.js APIサーバー
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth/      # 認証ルート
│   │   │   ├── users/     # ユーザールート
│   │   │   ├── admin/     # 管理者ルート
│   │   │   └── predictions/ # 予想ルート
│   │   ├── services/
│   │   │   ├── prediction/ # 予想アルゴリズム
│   │   │   ├── stripe/    # 決済処理
│   │   │   └── lottery/   # ロトデータ処理
│   │   └── models/        # データモデル
└── scripts/               # バッチ処理・定期タスク
```

## 3. データベース設計

### 3.1 コレクション構造

#### Users（ユーザー）
```typescript
{
  _id: ObjectId,
  email: string,
  password: string, // bcryptハッシュ
  name: string,
  role: 'user' | 'admin',
  emailVerified: boolean,
  subscription: {
    status: 'active' | 'inactive' | 'cancelled',
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodEnd: Date,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

#### Predictions（予想）
```typescript
{
  _id: ObjectId,
  drawNumber: number,        // 第○○回
  drawDate: Date,           // 抽選日
  dataLogicPredictions: string[], // データロジック予想（最大10個）
  aiPredictions: string[],  // AI予想（最大10個）
  generatedAt: Date,        // 予想生成日時
  viewCount: number,        // 閲覧数
  createdAt: Date,
}
```

#### DrawResults（抽選結果）
```typescript
{
  _id: ObjectId,
  drawNumber: number,       // 第○○回
  drawDate: Date,          // 抽選日
  winningNumber: string,   // 当選番号（4桁）
  prize: {
    amount: number,        // 賞金額
    winners: number,       // 当選者数
  },
  fetchedAt: Date,         // データ取得日時
}
```

#### PredictionResults（予想結果）
```typescript
{
  _id: ObjectId,
  predictionId: ObjectId,  // 予想への参照
  drawResultId: ObjectId,  // 抽選結果への参照
  hits: {
    dataLogic: string[],   // 的中した番号
    ai: string[],          // 的中した番号
  },
  prizeWon: number,        // 獲得賞金
  createdAt: Date,
}
```

### 3.2 インデックス設計
- Users: email（unique）, role, subscription.status
- Predictions: drawNumber（unique）, drawDate
- DrawResults: drawNumber（unique）, drawDate
- PredictionResults: predictionId, drawResultId

## 4. API設計詳細

### 4.1 ユーザーAPI
```
POST   /api/v1/auth/register          # 会員登録
POST   /api/v1/auth/login            # ログイン
POST   /api/v1/auth/logout           # ログアウト
POST   /api/v1/auth/refresh          # トークンリフレッシュ
POST   /api/v1/auth/forgot-password  # パスワードリセット申請
POST   /api/v1/auth/reset-password   # パスワードリセット実行
POST   /api/v1/auth/verify-email     # メール確認

GET    /api/v1/users/profile         # プロフィール取得
PUT    /api/v1/users/profile         # プロフィール更新

GET    /api/v1/predictions           # 予想一覧（過去分）
GET    /api/v1/predictions/latest    # 最新予想（有料会員のみ）
GET    /api/v1/predictions/:id       # 予想詳細

POST   /api/v1/subscribe/checkout    # Stripe Checkout作成
POST   /api/v1/subscribe/portal      # Stripe Portal作成
POST   /api/v1/subscribe/webhook     # Stripe Webhook
```

### 4.2 管理API
```
POST   /api/v1/admin/auth/login      # 管理者ログイン

GET    /api/v1/admin/users           # ユーザー一覧
GET    /api/v1/admin/users/:id       # ユーザー詳細
PUT    /api/v1/admin/users/:id       # ユーザー更新
DELETE /api/v1/admin/users/:id       # ユーザー削除

POST   /api/v1/admin/predictions     # 予想生成実行
GET    /api/v1/admin/predictions     # 予想一覧
PUT    /api/v1/admin/predictions/:id # 予想更新

POST   /api/v1/admin/draw-results    # 抽選結果登録
GET    /api/v1/admin/draw-results    # 抽選結果一覧

GET    /api/v1/admin/analytics       # 統計情報
GET    /api/v1/admin/analytics/revenue # 収益分析
```

## 5. 予想アルゴリズム実装

### 5.1 データロジック予想
```typescript
interface DataLogicPrediction {
  analyze(drawResults: DrawResult[]): string[];
}

class FrequencyBasedPrediction implements DataLogicPrediction {
  analyze(drawResults: DrawResult[]): string[] {
    // 1. 過去100回の当選番号を桁別に分析
    const digitFrequency = this.calculateDigitFrequency(drawResults);
    
    // 2. 各桁で最頻出の数字を抽出
    const mostFrequentDigits = this.extractMostFrequentDigits(digitFrequency);
    
    // 3. 順列を生成（最大10個）
    return this.generatePermutations(mostFrequentDigits, 10);
  }
}
```

### 5.2 AI予想
```typescript
interface AIPrediction {
  predict(drawResults: DrawResult[]): Promise<string[]>;
}

class NeuralNetworkPrediction implements AIPrediction {
  async predict(drawResults: DrawResult[]): Promise<string[]> {
    // 1. データの前処理
    const features = this.preprocessData(drawResults);
    
    // 2. モデルによる予測
    const predictions = await this.model.predict(features);
    
    // 3. 予測結果を4桁番号に変換
    return this.formatPredictions(predictions);
  }
}
```

## 6. セキュリティ実装詳細

### 6.1 認証分離
- **ユーザー認証**: JWT（HttpOnly Cookie）+ リフレッシュトークン
- **管理者認証**: 別系統のJWT + 2要素認証（将来実装）
- **セッション管理**: Redis によるトークンブラックリスト

### 6.2 セキュリティ対策
- **レート制限**: 
  - ログイン試行: 5回/15分
  - API呼び出し: 100回/15分
  - 予想閲覧: 10回/日（無料会員）
- **CSRF対策**: SameSite Cookie + CSRFトークン
- **XSS対策**: 入力検証 + コンテンツセキュリティポリシー
- **SQLインジェクション対策**: パラメータ化クエリ（Mongoose使用）

## 7. 実装フェーズ

### Phase 1: 基盤構築（2週間）
1. データベース設計・構築
2. 認証システム実装
3. 基本的なAPI構築
4. Stripe統合

### Phase 2: コア機能開発（3週間）
1. 予想アルゴリズム実装
2. ユーザーダッシュボード
3. 予想結果表示機能
4. サブスクリプション管理

### Phase 3: 管理機能開発（2週間）
1. 管理者ダッシュボード
2. ユーザー管理機能
3. 予想・結果管理
4. 統計・分析機能

### Phase 4: 自動化・最適化（1週間）
1. 定期タスク実装（cron）
2. キャッシュ最適化
3. パフォーマンスチューニング
4. エラー監視設定

### Phase 5: テスト・デプロイ（1週間）
1. 統合テスト
2. 負荷テスト
3. セキュリティ監査
4. 本番環境デプロイ

## 8. 運用考慮事項

### 8.1 定期タスク
- **毎日19:00**: ロト抽選結果を自動取得
- **毎日20:00**: 次回予想を自動生成
- **毎月1日**: サブスクリプション更新処理
- **毎週月曜**: 統計レポート生成

### 8.2 監視項目
- API応答時間
- エラー率
- サブスクリプション成功率
- 予想的中率
- システムリソース使用率

### 8.3 バックアップ戦略
- データベース: 日次バックアップ（過去30日分保持）
- ログ: 14日間保持
- 予想履歴: 永続保存

## 9. 拡張性考慮

### 9.1 将来の機能拡張
- 複数のロト種別対応（ロト6、ロト7）
- SNS連携（予想共有機能）
- コミュニティ機能
- より高度なAI予測モデル

### 9.2 スケーラビリティ
- 水平スケーリング対応（ロードバランサー）
- マイクロサービス化の準備
- CDN活用（静的アセット）
- データベースシャーディング準備