#!/bin/bash

# 簡易デプロイスクリプト - 最小限の手順で素早くデプロイ

set -e

echo "🚀 Quick deployment starting..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# Git pull
echo "📥 Pulling latest changes..."
git pull

# 並列ビルド
echo "🔧 Building backend and frontend in parallel..."
(
    cd backend && 
    npm install && 
    npm run build &&
    echo "✅ Backend build complete"
) &

(
    cd frontend && 
    npm install && 
    npm run build &&
    echo "✅ Frontend build complete"
) &

# 両方のビルドが完了するまで待つ
wait

# PM2で再起動
echo "🔄 Restarting services..."
pm2 restart l4l6-backend l4l6-frontend
pm2 save

echo "✅ Quick deployment complete!"
pm2 status