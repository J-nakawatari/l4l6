#!/bin/bash

# Git post-merge hookを設定して、git pull後に自動デプロイを実行

set -e

echo "🔧 Setting up auto-deploy on git pull..."

# プロジェクトルートに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# .git/hooks/post-merge ファイルを作成
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash
# Git post-merge hook - 自動デプロイを実行

echo "🚀 Auto-deploying after git pull..."

# プロジェクトルートを取得
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# quick-deploy.shを実行
if [ -f "$PROJECT_ROOT/scripts/quick-deploy.sh" ]; then
    echo "Running quick-deploy.sh..."
    "$PROJECT_ROOT/scripts/quick-deploy.sh"
else
    echo "⚠️  quick-deploy.sh not found!"
fi
EOF

# 実行権限を付与
chmod +x .git/hooks/post-merge

echo "✅ Auto-deploy hook installed successfully!"
echo ""
echo "📌 From now on, running 'git pull' will automatically:"
echo "   1. Pull the latest changes"
echo "   2. Build frontend and backend"
echo "   3. Restart PM2 services"
echo ""
echo "💡 To disable auto-deploy: rm .git/hooks/post-merge"