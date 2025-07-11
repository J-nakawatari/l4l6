# L4L6 - ナンバーズ4予想アプリケーション | Claude開発ガイド

このファイルは、Claude（AI開発アシスタント）が新しいチャットでプロジェクトを即座に理解できるようにまとめたガイドです。

## 🎯 プロジェクト概要

**L4L6** = **ナンバーズ4予想アプリケーション**
- **目的**: ナンバーズ4の当選番号を予想するWebアプリケーション
- **重要**: ロト6からナンバーズ4に仕様変更済み（一部文言は更新が必要）
- **サイトURL**: https://l4l6.com/
- **GitHubリポジトリ**: https://github.com/J-nakawatari/l4l6.git

## 🏗️ 技術構成

### フロントエンド (`/frontend`)
- **フレームワーク**: Next.js 15.3.5 + React 19 + TypeScript
- **スタイリング**: Tailwind CSS
- **UIライブラリ**: Tabler Icons, ApexCharts
- **決済**: Stripe JS
- **通知**: React Hot Toast
- **テスト**: Jest + Testing Library

### バックエンド (`/backend`)
- **フレームワーク**: Express.js + TypeScript + Node.js
- **データベース**: MongoDB (Mongoose)
- **認証**: JWT (HttpOnly Cookie)
- **決済**: Stripe
- **スクレイピング**: Puppeteer + Cheerio
- **バリデーション**: Joi
- **ログ**: Winston
- **セキュリティ**: Helmet, CORS, Rate Limiting
- **テスト**: Jest + Supertest + MongoDB Memory Server

### インフラ & デプロイ
- **コンテナ**: Docker + Docker Compose
- **デプロイ**: Vercel (フロント・バック両方)
- **環境変数**: `.env` (各環境別)

## 🔧 開発環境セットアップ

### 必要な環境
- Node.js 18+
- MongoDB
- Docker & Docker Compose

### セットアップ手順
```bash
# リポジトリクローン
git clone https://github.com/J-nakawatari/l4l6.git
cd l4l6

# バックエンド
cd backend
npm install
cp .env.example .env  # 環境変数を設定
npm run dev  # 開発サーバー起動

# フロントエンド（別ターミナル）
cd frontend
npm install
npm run dev  # 開発サーバー起動

# Docker環境（オプション）
docker-compose up
```

### 重要なコマンド

#### バックエンド
```bash
npm run dev           # 開発サーバー起動
npm run build         # ビルド
npm run test          # テスト実行
npm run test:watch    # テスト監視モード
npm run lint          # ESLint実行
npm run create-admin  # 管理者アカウント作成
```

#### フロントエンド
```bash
npm run dev           # 開発サーバー起動 (Turbopack)
npm run build         # ビルド
npm run test          # テスト実行
npm run lint          # Next.js Lint
```

## 📋 主要機能

1. **ナンバーズ4予想表示** - 次回予想の表示
2. **過去予想履歴** - 過去の予想結果確認
3. **サブスクリプション管理** - Stripe決済連携
4. **管理画面** - ユーザー管理機能
5. **データ更新** - 定期的なナンバーズ4データスクレイピング

## ⚠️ 開発上の重要な注意点

### 現在の状況
- **仕様変更中**: ロト6 → ナンバーズ4への移行作業
- **自動更新**: `backend/update_numbers4.sh` でナンバーズ4データを定期取得
- **Claude Code Desktop**使用時の接続エラーは環境設定を確認

### 開発原則（CLAUDE.mdより）
1. **テスト駆動開発（TDD）**: 機能実装前にテストを書く
2. **型安全性**: TypeScript strictモード
3. **セキュリティファースト**: 全エンドポイントに認証・検証
4. **APIファースト**: OpenAPI仕様書を先に定義

### 厳守ルール
- テストなしでコードをコミットしない
- 型定義なしでコードを書かない
- 入力検証なしでAPIを作らない
- console.logを本番コードに残さない

## 🗂️ ディレクトリ構造

```
l4l6/
├── frontend/          # Next.js フロントエンド
│   ├── src/
│   ├── public/
│   ├── tests/
│   └── package.json
├── backend/           # Express.js バックエンド
│   ├── src/
│   ├── api/           # API定義
│   ├── tests/
│   ├── docs/          # OpenAPI文書
│   └── update_numbers4.sh  # 定期更新スクリプト
├── docs/              # プロジェクト文書
├── scripts/           # ユーティリティスクリプト
├── docker-compose.yml # Docker設定
└── vercel.json        # Vercel デプロイ設定
```

## 🔑 重要なファイル

- `CLAUDE.md` - Claude用開発ガイドライン
- `README-DEPLOYMENT.md` - デプロイ手順
- `VPS_PORT_USAGE.md` - ポート使用状況
- `.env.example` - 環境変数テンプレート
- `backend/VERCEL_DEPLOYMENT.md` - Vercelデプロイ詳細

## 🚨 よくあるトラブル & 解決法

### Claude Code Desktop 接続エラー
```bash
# サーバーが起動しているか確認
cd backend && npm run dev
cd frontend && npm run dev

# ポート競合確認
lsof -i :3000  # Next.js
lsof -i :8000  # Express

# Docker環境再起動
docker-compose down && docker-compose up
```

### 開発環境リセット
```bash
# node_modules削除 & 再インストール
rm -rf node_modules package-lock.json
npm install

# Docker環境クリーン
docker-compose down -v
docker system prune -f
```

## 📞 新しいチャットでの効率的な相談方法

新しいChaudeチャットで相談する際は、以下のテンプレートを使用：

```
GitHubリポジトリ: https://github.com/J-nakawatari/l4l6.git
L4L6プロジェクト（ナンバーズ4予想アプリ）について相談したいです。

現在の問題: [具体的な問題や作業内容]
エラーメッセージ: [あれば貼り付け]
作業環境: [ローカル/Docker/Claude Code Desktop]

このREADMEファイルにプロジェクトの詳細情報が記載されています。
```

---

**開発者メモ**: このファイルは新しいチャットでの効率性向上のために作成。プロジェクト状況に変更があれば随時更新してください。