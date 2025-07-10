# ロト6予想アプリケーション

次回のロト6の当選番号を予想するWebアプリケーションです。

## 機能

- 次回予想の表示
- 過去の予想履歴
- サブスクリプション管理
- 管理画面（ユーザー管理）

## セットアップ

### 必要な環境

- Node.js 18+
- MongoDB
- Redis（オプション）

### インストール

```bash
# バックエンドの依存関係をインストール
cd backend
npm install

# フロントエンドの依存関係をインストール
cd ../frontend
npm install
```

### 環境変数

バックエンドの `.env` ファイルを作成：

```bash
cd backend
cp .env.example .env
```

必要な環境変数を設定してください。

### 管理者アカウントの作成

管理画面にアクセスするには、管理者アカウントが必要です。

```bash
cd backend
npm run create-admin
```

コマンドを実行すると、以下の情報を入力するよう求められます：
- メールアドレス
- パスワード
- 名前

作成が完了すると、管理画面のURLが表示されます。

### 開発サーバーの起動

```bash
# バックエンド
cd backend
npm run dev

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

## 管理画面

管理画面は `http://localhost:3000/admin/login` からアクセスできます。

### 管理画面でできること

- ユーザーの一覧表示
- ユーザーの検索（メールアドレス、名前）
- ユーザーアカウントの停止/再開
- ユーザーアカウントの削除

## テスト

```bash
cd backend
npm test
```

## ビルド

```bash
# バックエンド
cd backend
npm run build

# フロントエンド
cd frontend
npm run build
```