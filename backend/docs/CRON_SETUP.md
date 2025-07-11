# 自動予想生成のcron設定ガイド

## 概要
ナンバーズ4の当選結果取得と予想生成を自動化するためのcron設定手順です。

## 必要なスクリプト

1. **当選結果取得**: `dailyNumbers4Update.js`
   - 楽天・みずほ銀行から最新の当選結果を取得

2. **予想生成**: `generateDailyPredictions.js`
   - 各種アルゴリズムで次回の予想を生成

## cron設定手順

### 1. cronエディタを開く
```bash
# 本番サーバーにSSH接続後
sudo crontab -e

# またはユーザー権限で
crontab -e
```

### 2. 以下の設定を追加

```cron
# ナンバーズ4当選結果取得（毎日19:30）
30 19 * * * cd /var/www/l4l6/backend && /usr/bin/node src/scripts/dailyNumbers4Update.js >> logs/numbers4-update.log 2>&1

# ナンバーズ4予想生成（毎日20:00）
0 20 * * * cd /var/www/l4l6/backend && /usr/bin/node src/scripts/generateDailyPredictions.js >> logs/prediction-generation.log 2>&1
```

### 3. 設定を確認
```bash
crontab -l
```

## ログファイルの確認

```bash
# 当選結果取得ログ
tail -f /var/www/l4l6/backend/logs/numbers4-update.log

# 予想生成ログ
tail -f /var/www/l4l6/backend/logs/prediction-generation.log
```

## トラブルシューティング

### 1. 権限エラーの場合
```bash
# ログディレクトリの作成と権限設定
mkdir -p /var/www/l4l6/backend/logs
chmod 755 /var/www/l4l6/backend/logs
```

### 2. Node.jsのパスが異なる場合
```bash
# Node.jsのパスを確認
which node
# 結果を使ってcronのパスを更新
```

### 3. 環境変数が読み込まれない場合
cronジョブの先頭に以下を追加：
```cron
# 環境変数の読み込み
. /var/www/l4l6/backend/.env
```

### 4. 手動実行でテスト
```bash
cd /var/www/l4l6/backend
node src/scripts/dailyNumbers4Update.js
node src/scripts/generateDailyPredictions.js
```

## 運用上の注意

1. **実行時間**
   - 19:30: 当選結果取得（抽選は19:00頃）
   - 20:00: 予想生成

2. **祝日対応**
   - スクリプト内で祝日判定を実装済み
   - 土日祝日は抽選がないため、予想は生成されない

3. **重複防止**
   - 同じ抽選回の予想は重複生成されない
   - 既に存在する場合はスキップ

4. **エラー通知**（オプション）
```cron
# エラー時にメール通知
0 20 * * * cd /var/www/l4l6/backend && /usr/bin/node src/scripts/generateDailyPredictions.js >> logs/prediction-generation.log 2>&1 || echo "Prediction generation failed" | mail -s "L4L6 Cron Error" admin@example.com
```

## 動作確認

1. 翌日の朝、以下を確認：
   - MongoDBに新しい当選結果が追加されているか
   - 新しい予想が生成されているか
   - フロントエンドで予想が表示されるか

```bash
# MongoDBで確認
mongo
use l4l6
db.drawresults.find().sort({drawNumber: -1}).limit(1).pretty()
db.predictions.find().sort({drawNumber: -1}).limit(1).pretty()
```