# Node.js 18 LTS をベースイメージとして使用
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 本番用イメージ
FROM node:18-alpine

WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 本番用の依存関係のみインストール
RUN npm ci --only=production

# ビルドされたアプリケーションをコピー
COPY --from=builder /app/dist ./dist

# 環境変数
ENV NODE_ENV=production

# ポート5000を公開
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# アプリケーションを起動
CMD ["node", "dist/server.js"]