#!/bin/bash

# デプロイスクリプト - git pull後に自動的にビルドと再起動を行う

set -e  # エラーが発生したら停止

echo "🚀 Starting deployment process..."

# プロジェクトルートディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📂 Working directory: $PROJECT_ROOT"

# 1. Git pull
echo "📥 Pulling latest changes from git..."
git pull origin main

# 2. バックエンドのビルド
echo "🔧 Building backend..."
cd backend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi
echo "✅ Backend build successful"

# 3. フロントエンドのビルド
echo "🔧 Building frontend..."
cd ../frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend build successful"

# 4. PM2でサービスを再起動
echo "🔄 Restarting services with PM2..."
cd "$PROJECT_ROOT"

# バックエンドの再起動
pm2 restart l4l6-backend || pm2 start backend/dist/server.js --name l4l6-backend
if [ $? -ne 0 ]; then
    echo "❌ Failed to restart backend!"
    exit 1
fi

# フロントエンドの再起動
pm2 restart l4l6-frontend || pm2 start frontend/node_modules/.bin/next --name l4l6-frontend -- start -p 3002
if [ $? -ne 0 ]; then
    echo "❌ Failed to restart frontend!"
    exit 1
fi

# PM2の設定を保存
pm2 save

# 5. ステータス確認
echo "📊 Checking service status..."
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:3002"
echo "🔌 Backend API: http://localhost:5000"
echo ""
echo "💡 Tip: Run 'pm2 logs' to see application logs"