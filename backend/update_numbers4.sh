#!/bin/bash

# Numbers4定期更新スクリプト
# プロジェクトディレクトリに移動
cd /home/jun/projects/l4l6/backend

# ログディレクトリを作成
mkdir -p logs

# ログファイル
LOG_FILE="logs/numbers4_update_$(date +%Y%m).log"

# 実行開始
echo "========================================" >> $LOG_FILE
echo "実行開始: $(date '+%Y-%m-%d %H:%M:%S')" >> $LOG_FILE

# Node.jsスクリプトを実行
/usr/bin/node src/scripts/scrapeNumbersRenban.js >> $LOG_FILE 2>&1

# 実行完了
echo "実行完了: $(date '+%Y-%m-%d %H:%M:%S')" >> $LOG_FILE
echo "" >> $LOG_FILE