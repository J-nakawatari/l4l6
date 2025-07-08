# CLAUDE.md

このファイルは、Claude Code（AI開発アシスタント）がこのプロジェクトで作業する際のガイドラインです。

## プロジェクト概要
[プロジェクトの目的と主要機能を記載]

## 技術スタック
- フロントエンド: [Next.js/React] + TypeScript + Tailwind CSS
- バックエンド: Express.js + TypeScript + MongoDB
- テスト: Jest + Supertest + Playwright
- 認証: JWT (HttpOnly Cookie)
- 決済: Stripe
- キャッシュ: Redis

## 開発原則
1. **テスト駆動開発（TDD）**: 機能実装前にテストを書く
2. **型安全性**: TypeScript strictモード
3. **セキュリティファースト**: 全エンドポイントに認証・検証
4. **APIファースト**: OpenAPI仕様書を先に定義

## 厳守ルール
- テストなしでコードをコミットしない
- 型定義なしでコードを書かない
- 入力検証なしでAPIを作らない
- console.logを本番コードに残さない

## 開発コマンド
```bash
npm run dev        # 開発サーバー起動
npm run test       # テスト実行
npm run test:watch # テスト監視モード
npm run lint       # コード検証
npm run build      # ビルド
```