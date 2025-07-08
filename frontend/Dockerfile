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

# Next.js アプリケーションをビルド
RUN npm run build

# 本番用イメージ
FROM node:18-alpine

WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 本番用の依存関係のみインストール
RUN npm ci --only=production

# ビルドされたアプリケーションをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# 環境変数
ENV NODE_ENV=production
ENV PORT=3002

# ポート3002を公開
EXPOSE 3002

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# アプリケーションを起動
CMD ["npm", "start"]