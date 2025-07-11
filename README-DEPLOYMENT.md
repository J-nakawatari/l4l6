# デプロイメントガイド

このプロジェクトには3つのデプロイスクリプトが用意されています。

## スクリプト一覧

### 1. quick-deploy.sh（推奨）
最も簡単で高速なデプロイスクリプト。通常の更新にはこれを使用してください。

```bash
cd /home/jun/projects/l4l6
./scripts/quick-deploy.sh
```

**特徴：**
- Git pullして最新コードを取得
- バックエンドとフロントエンドを並列ビルド（高速）
- PM2でサービスを再起動
- エラーがあれば即座に停止

### 2. deploy.sh
標準的なデプロイスクリプト。順番にビルドと再起動を実行します。

```bash
cd /home/jun/projects/l4l6
./scripts/deploy.sh
```

**特徴：**
- 順次実行で確実な動作
- 詳細なステータス表示
- PM2の自動設定保存

### 3. deploy-production.sh
本番環境用の慎重なデプロイスクリプト。重要な更新時に使用。

```bash
cd /home/jun/projects/l4l6
./scripts/deploy-production.sh
```

**特徴：**
- ログファイルへの記録
- node_modulesのバックアップ
- ビルド失敗時の自動ロールバック
- ヘルスチェック実行
- Nginx設定の再読み込み

## 使用例

### 通常の更新
```bash
# リポジトリに移動
cd /home/jun/projects/l4l6

# 最新のコードをプル＆デプロイ
./scripts/quick-deploy.sh
```

### 重要な更新（本番環境）
```bash
# 慎重なデプロイ実行
./scripts/deploy-production.sh

# ログを確認
tail -f logs/deploy-*.log
```

### デプロイ後の確認
```bash
# サービスの状態確認
pm2 status

# ログの確認
pm2 logs l4l6-backend
pm2 logs l4l6-frontend

# ヘルスチェック
curl http://localhost:5000/health
curl http://localhost:3002
```

## トラブルシューティング

### ビルドエラーが発生した場合
```bash
# ログを確認
pm2 logs --err

# 手動でビルドテスト
cd backend && npm run build
cd ../frontend && npm run build
```

### サービスが起動しない場合
```bash
# PM2のリセット
pm2 delete all
pm2 start ecosystem.config.js

# ポートの確認
sudo lsof -i :3002
sudo lsof -i :5000
```

### ロールバックが必要な場合
```bash
# 前のコミットに戻す
git log --oneline -5
git checkout [前のコミットハッシュ]

# 再デプロイ
./scripts/quick-deploy.sh
```

## 自動デプロイの設定

### 方法1: Git Hook（簡単・推奨）
`git pull`実行時に自動的にデプロイを実行します。

```bash
# 本番サーバーで実行
cd /var/www/l4l6
./scripts/setup-auto-deploy.sh
```

これで`git pull`すると自動的に：
1. 最新コードを取得
2. ビルド実行
3. PM2再起動

### 方法2: systemd（高度）
ファイル監視による完全自動化：

```bash
# セットアップスクリプトを実行
./scripts/setup-systemd-deploy.sh

# 表示されるコマンドをrootで実行
```

### 自動デプロイの無効化
```bash
# Git hookを削除
rm .git/hooks/post-merge

# またはsystemdサービスを停止
sudo systemctl disable l4l6-deploy.path
```