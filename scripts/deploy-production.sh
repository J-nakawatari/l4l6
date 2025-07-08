#!/bin/bash

# 本番環境用デプロイスクリプト - より慎重なアプローチ

set -e  # エラーが発生したら停止

echo "🚀 Starting production deployment..."

# プロジェクトルートディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# ログファイルの設定
LOG_FILE="$PROJECT_ROOT/logs/deploy-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$PROJECT_ROOT/logs"

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "📂 Working directory: $PROJECT_ROOT"

# 1. 現在のコミットハッシュを記録
CURRENT_COMMIT=$(git rev-parse HEAD)
log "Current commit: $CURRENT_COMMIT"

# 2. Git pull
log "📥 Pulling latest changes from git..."
git pull origin main 2>&1 | tee -a "$LOG_FILE"

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    log "ℹ️  No new changes detected. Exiting."
    exit 0
fi

log "New commit: $NEW_COMMIT"

# 3. 依存関係のバックアップ（念のため）
log "💾 Backing up current node_modules..."
if [ -d "backend/node_modules" ]; then
    mv backend/node_modules backend/node_modules.backup
fi
if [ -d "frontend/node_modules" ]; then
    mv frontend/node_modules frontend/node_modules.backup
fi

# 4. バックエンドのビルド
log "🔧 Building backend..."
cd backend
npm ci --production=false  # ci を使用して一貫性のあるインストール
npm run build 2>&1 | tee -a "$LOG_FILE"
if [ $? -ne 0 ]; then
    log "❌ Backend build failed! Rolling back..."
    # ロールバック
    rm -rf node_modules
    mv node_modules.backup node_modules
    cd "$PROJECT_ROOT"
    git checkout "$CURRENT_COMMIT"
    exit 1
fi
log "✅ Backend build successful"

# 5. フロントエンドのビルド
log "🔧 Building frontend..."
cd ../frontend
npm ci --production=false
npm run build 2>&1 | tee -a "$LOG_FILE"
if [ $? -ne 0 ]; then
    log "❌ Frontend build failed! Rolling back..."
    # ロールバック
    rm -rf node_modules
    mv node_modules.backup node_modules
    cd ../backend
    rm -rf node_modules
    mv node_modules.backup node_modules
    cd "$PROJECT_ROOT"
    git checkout "$CURRENT_COMMIT"
    exit 1
fi
log "✅ Frontend build successful"

# 6. ビルド成功後、バックアップを削除
log "🗑️  Removing backups..."
cd "$PROJECT_ROOT"
rm -rf backend/node_modules.backup
rm -rf frontend/node_modules.backup

# 7. PM2でサービスを再起動（グレースフルリスタート）
log "🔄 Restarting services with PM2..."

# バックエンドの再起動
log "Restarting backend..."
pm2 reload l4l6-backend --update-env 2>&1 | tee -a "$LOG_FILE" || {
    log "Starting backend service..."
    pm2 start backend/dist/server.js --name l4l6-backend 2>&1 | tee -a "$LOG_FILE"
}

# フロントエンドの再起動
log "Restarting frontend..."
pm2 reload l4l6-frontend --update-env 2>&1 | tee -a "$LOG_FILE" || {
    log "Starting frontend service..."
    cd frontend
    pm2 start npm --name l4l6-frontend -- start 2>&1 | tee -a "$LOG_FILE"
    cd ..
}

# PM2の設定を保存
pm2 save 2>&1 | tee -a "$LOG_FILE"

# 8. ヘルスチェック
log "🏥 Performing health checks..."
sleep 5  # サービスが起動するまで待機

# バックエンドのヘルスチェック
if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    log "✅ Backend is healthy"
else
    log "⚠️  Backend health check failed"
fi

# フロントエンドのヘルスチェック
if curl -f http://localhost:3002 >/dev/null 2>&1; then
    log "✅ Frontend is healthy"
else
    log "⚠️  Frontend health check failed"
fi

# 9. ステータス確認
log "📊 Service status:"
pm2 status 2>&1 | tee -a "$LOG_FILE"

log "✅ Deployment completed successfully!"
log "📄 Full log available at: $LOG_FILE"

# Nginxの再読み込み（設定が変更された場合のため）
if command -v nginx &> /dev/null; then
    log "🔄 Reloading Nginx configuration..."
    sudo nginx -t && sudo nginx -s reload
fi

echo ""
echo "🎉 Production deployment complete!"
echo "🌐 Frontend: https://l4l6.com"
echo "🔌 Backend API: https://l4l6.com/api"
echo "📄 Deployment log: $LOG_FILE"