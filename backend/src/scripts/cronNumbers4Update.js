const mongoose = require('mongoose');
require('dotenv').config();

// DrawResultスキーマ（150件のみ保持）
const DrawResultSchema = new mongoose.Schema({
  drawNumber: { type: Number, unique: true },
  drawDate: Date,
  winningNumber: String,
  prize: {
    straight: {
      winners: Number,
      amount: Number
    },
    box: {
      winners: Number,
      amount: Number
    }
  },
  salesAmount: Number,
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

/**
 * 手動でデータを追加する関数
 * Puppeteerが動作しない環境やスクレイピングが難しい場合の代替案
 */
async function manualDataEntry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Numbers4 手動データ更新 ===');
    console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
    
    // ここに最新のデータを手動で入力
    // 例: みずほ銀行のサイトを手動で確認して入力
    const latestResults = [
      // {
      //   drawNumber: 6765,
      //   drawDate: new Date(2025, 6, 9), // 2025年7月9日
      //   winningNumber: '1234',
      //   prize: {
      //     straight: { winners: 20, amount: 900000 },
      //     box: { winners: 200, amount: 37500 }
      //   }
      // }
    ];
    
    if (latestResults.length === 0) {
      console.log('\n新しいデータがありません。');
      console.log('使い方:');
      console.log('1. みずほ銀行のサイトで最新の当選番号を確認');
      console.log('2. latestResults配列にデータを追加');
      console.log('3. このスクリプトを再実行');
      
      // 現在の最新データを表示
      const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
      if (latest) {
        console.log(`\n現在の最新: 第${latest.drawNumber}回 (${latest.drawDate.toLocaleDateString('ja-JP')})`);
      }
      
      return;
    }
    
    // データを追加
    let addedCount = 0;
    for (const result of latestResults) {
      try {
        const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
        if (!existing) {
          await DrawResult.create({
            ...result,
            fetchedAt: new Date()
          });
          addedCount++;
          console.log(`追加: 第${result.drawNumber}回 (${result.winningNumber})`);
        } else {
          console.log(`スキップ: 第${result.drawNumber}回 (既存)`);
        }
      } catch (err) {
        console.error(`エラー: 第${result.drawNumber}回 - ${err.message}`);
      }
    }
    
    // 150件を超えた分を削除
    if (addedCount > 0) {
      const total = await DrawResult.countDocuments();
      if (total > 150) {
        const deleteCount = total - 150;
        const oldestDocs = await DrawResult.find()
          .sort({ drawNumber: 1 })
          .limit(deleteCount);
        
        for (const doc of oldestDocs) {
          await DrawResult.deleteOne({ _id: doc._id });
          console.log(`削除: 第${doc.drawNumber}回`);
        }
      }
    }
    
    // 最終状態を表示
    const finalCount = await DrawResult.countDocuments();
    const finalLatest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const finalOldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    
    console.log('\n=== 更新後の状態 ===');
    console.log(`総データ数: ${finalCount}件`);
    if (finalOldest && finalLatest) {
      console.log(`データ範囲: 第${finalOldest.drawNumber}回～第${finalLatest.drawNumber}回`);
      console.log(`期間: ${finalOldest.drawDate.toLocaleDateString('ja-JP')} ～ ${finalLatest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * クーロンジョブ用のシェルスクリプトを生成
 */
function generateCronScript() {
  const script = `#!/bin/bash
# Numbers4定期更新スクリプト

# プロジェクトディレクトリに移動
cd /home/jun/projects/l4l6/backend

# ログファイル
LOG_FILE="logs/numbers4_update.log"
mkdir -p logs

# 実行
echo "========================================" >> $LOG_FILE
echo "実行開始: $(date)" >> $LOG_FILE

# Node.jsスクリプトを実行
/usr/bin/node src/scripts/cronNumbers4Update.js >> $LOG_FILE 2>&1

echo "実行完了: $(date)" >> $LOG_FILE
echo "" >> $LOG_FILE`;

  console.log('\n=== Cronジョブ設定 ===');
  console.log('1. 以下の内容で update_numbers4.sh を作成:');
  console.log(script);
  console.log('\n2. 実行権限を付与:');
  console.log('chmod +x update_numbers4.sh');
  console.log('\n3. crontabに追加 (毎日午後9時):');
  console.log('0 21 * * * /home/jun/projects/l4l6/backend/update_numbers4.sh');
}

// メイン実行
if (require.main === module) {
  const arg = process.argv[2];
  
  if (arg === '--cron-setup') {
    generateCronScript();
  } else {
    manualDataEntry();
  }
}

module.exports = {
  manualDataEntry
};