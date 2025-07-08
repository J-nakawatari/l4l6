# L4L6バックエンド Vercelデプロイ手順

## 必要な環境変数

Vercelのダッシュボードで以下の環境変数を設定する必要があります：

### 必須環境変数
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/l4l6?retryWrites=true&w=majority
JWT_SECRET=<本番用の安全なランダム文字列>
FRONTEND_URL=https://your-frontend-domain.vercel.app
STRIPE_SECRET_KEY=sk_live_<本番用Stripeシークレットキー>
STRIPE_WEBHOOK_SECRET=whsec_<Stripe Webhook署名シークレット>
```

### オプション環境変数
```
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<安全な管理者パスワード>
```

## MongoDB Atlas設定手順

### 1. MongoDB Atlasアカウント作成
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)にアクセス
2. 無料アカウントを作成（既存のGoogleアカウントでも可）

### 2. クラスターの作成
1. 「Build a Database」をクリック
2. 「Shared」（無料プラン）を選択
3. クラウドプロバイダーとリージョンを選択：
   - AWS、Google Cloud、またはAzureから選択
   - 最寄りのリージョンを選択（東京: ap-northeast-1）
4. クラスター名を入力（例：l4l6-cluster）
5. 「Create Cluster」をクリック

### 3. データベースユーザーの作成
1. 左サイドバーの「Database Access」をクリック
2. 「Add New Database User」をクリック
3. 認証方法：「Password」を選択
4. ユーザー名とパスワードを設定（パスワードは安全に保管）
5. データベースユーザー権限：「Read and write to any database」を選択
6. 「Add User」をクリック

### 4. ネットワークアクセスの設定
1. 左サイドバーの「Network Access」をクリック
2. 「Add IP Address」をクリック
3. 「Allow Access from Anywhere」を選択（0.0.0.0/0）
   - 注：本番環境では、可能であればVercelの固定IPを設定することを推奨
4. 「Confirm」をクリック

### 5. 接続文字列の取得
1. 「Database」タブに戻る
2. クラスターの「Connect」ボタンをクリック
3. 「Connect your application」を選択
4. ドライバー：「Node.js」、バージョン：「5.5 or later」を選択
5. 接続文字列をコピー：
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
6. `<username>`と`<password>`を実際の値に置き換え
7. データベース名を追加：`/l4l6?`の形式で

## Vercelデプロイ手順

### 1. 事前準備
```bash
# プロジェクトディレクトリに移動
cd /home/jun/projects/l4l6/backend

# 依存関係をインストール
npm install

# TypeScriptのビルドテスト
npm run build

# ローカルでの動作確認（オプション）
npm run dev
```

### 2. Vercel CLIのインストール（初回のみ）
```bash
npm install -g vercel
```

### 3. Vercelにログイン
```bash
vercel login
```

### 4. プロジェクトのデプロイ
```bash
# プロジェクトルートで実行
vercel

# 初回デプロイ時の質問に回答：
# - Set up and deploy: Y
# - Which scope: あなたのアカウントを選択
# - Link to existing project?: N
# - Project name: l4l6-backend（または任意の名前）
# - Directory: ./（現在のディレクトリ）
# - Override settings?: N
```

### 5. 環境変数の設定
1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. デプロイしたプロジェクトを選択
3. 「Settings」タブ → 「Environment Variables」
4. 上記の必須環境変数をすべて追加
5. 「Save」をクリック

### 6. 本番環境へのデプロイ
```bash
# 本番環境にデプロイ
vercel --prod
```

### 7. Stripe Webhookの設定
1. [Stripe Dashboard](https://dashboard.stripe.com)にログイン
2. 「Developers」→「Webhooks」
3. 「Add endpoint」をクリック
4. エンドポイントURL：`https://your-backend-domain.vercel.app/api/v1/payments/webhook`
5. イベントを選択：
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.failed`
6. 「Add endpoint」をクリック
7. 署名シークレットをコピーして、Vercelの環境変数`STRIPE_WEBHOOK_SECRET`に設定

## デプロイ後の確認

### 1. ヘルスチェック
```bash
curl https://your-backend-domain.vercel.app/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. ログの確認
Vercelダッシュボードの「Functions」タブでリアルタイムログを確認

### 3. MongoDB接続の確認
MongoDB Atlasダッシュボードで接続数を確認

## トラブルシューティング

### 1. MongoDB接続エラー
- IPホワイトリストの設定を確認
- 接続文字列のユーザー名/パスワードを確認
- ネットワークアクセスで0.0.0.0/0が許可されているか確認

### 2. Stripe Webhookエラー
- エンドポイントURLが正しいか確認
- 署名シークレットが正しく設定されているか確認
- Webhookイベントが正しく選択されているか確認

### 3. 環境変数エラー
- すべての必須環境変数が設定されているか確認
- 環境変数の値に余分な空白や引用符がないか確認

### 4. ビルドエラー
- `npm run build`がローカルで成功するか確認
- TypeScriptのバージョン互換性を確認
- node_modulesを削除して再インストール

## セキュリティ注意事項

1. **JWT_SECRET**：本番環境では必ず強力なランダム文字列を使用
2. **ADMIN_PASSWORD**：初期管理者パスワードは必ず変更
3. **MongoDB接続**：可能であれば特定のIPアドレスのみ許可
4. **環境変数**：機密情報は絶対にコードにハードコーディングしない

## メンテナンス

### 定期的な確認事項
1. MongoDB Atlasのストレージ使用量（無料プランは512MBまで）
2. Vercelの関数実行時間とリクエスト数
3. エラーログの監視
4. セキュリティアップデートの適用