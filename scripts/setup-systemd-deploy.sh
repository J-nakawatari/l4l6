#!/bin/bash

# systemdを使った自動デプロイサービスの設定（より高度な方法）

set -e

echo "🔧 Setting up systemd auto-deploy service..."

# サービスファイルの内容を生成
cat > /tmp/l4l6-deploy.service << EOF
[Unit]
Description=L4L6 Auto Deploy Service
After=network.target

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=/var/www/l4l6
ExecStart=/var/www/l4l6/scripts/deploy-on-change.sh
StandardOutput=journal
StandardError=journal
EOF

# パスモニタリングファイルを生成
cat > /tmp/l4l6-deploy.path << EOF
[Unit]
Description=Monitor L4L6 git repository for changes
After=network.target

[Path]
PathChanged=/var/www/l4l6/.git/refs/heads/main
Unit=l4l6-deploy.service

[Install]
WantedBy=multi-user.target
EOF

# デプロイスクリプトを作成
cat > /tmp/deploy-on-change.sh << 'EOF'
#!/bin/bash
# 変更検知時に実行されるスクリプト

cd /var/www/l4l6

# 最新の変更を取得
git fetch

# ローカルとリモートのコミットを比較
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "New changes detected, deploying..."
    git pull
    ./scripts/quick-deploy.sh
else
    echo "No new changes"
fi
EOF

echo ""
echo "📝 To complete the setup, run these commands as root:"
echo ""
echo "sudo cp /tmp/l4l6-deploy.service /etc/systemd/system/"
echo "sudo cp /tmp/l4l6-deploy.path /etc/systemd/system/"
echo "sudo cp /tmp/deploy-on-change.sh /var/www/l4l6/scripts/"
echo "sudo chmod +x /var/www/l4l6/scripts/deploy-on-change.sh"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable l4l6-deploy.path"
echo "sudo systemctl start l4l6-deploy.path"
echo ""
echo "This will monitor the git repository and auto-deploy when changes are detected."