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
 * 最新データを追加して150件を維持する
 * @param {Array} newResults - 新しい抽選結果の配列
 */
async function addNewResults(newResults) {
  let addedCount = 0;
  
  for (const result of newResults) {
    try {
      // 既に存在するかチェック
      const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
      if (!existing) {
        await DrawResult.create({
          ...result,
          fetchedAt: new Date()
        });
        addedCount++;
        console.log(`新規追加: 第${result.drawNumber}回 (${result.drawDate.toLocaleDateString('ja-JP')}): ${result.winningNumber}`);
      }
    } catch (err) {
      console.error(`エラー（第${result.drawNumber}回）:`, err.message);
    }
  }
  
  if (addedCount > 0) {
    // 150件を超えた分を削除
    const totalCount = await DrawResult.countDocuments();
    if (totalCount > 150) {
      const deleteCount = totalCount - 150;
      const oldestToDelete = await DrawResult.find()
        .sort({ drawNumber: 1 })
        .limit(deleteCount);
      
      for (const doc of oldestToDelete) {
        await DrawResult.deleteOne({ _id: doc._id });
        console.log(`削除: 第${doc.drawNumber}回`);
      }
    }
  }
  
  return addedCount;
}

/**
 * 手動でデータを追加する関数
 * 例: 新しい抽選結果が出た時に使用
 */
async function manualUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 例: 新しい抽選結果（実際のデータに置き換えてください）
    const newResults = [
      // {
      //   drawNumber: 6765,
      //   drawDate: new Date(2025, 6, 9),
      //   winningNumber: '1234',
      //   prize: {
      //     straight: { winners: 20, amount: 900000 },
      //     box: { winners: 200, amount: 37500 }
      //   },
      //   salesAmount: 200000000
      // }
    ];
    
    if (newResults.length === 0) {
      console.log('追加するデータがありません');
      console.log('\n使い方:');
      console.log('1. このファイルのnewResults配列に新しい抽選結果を追加');
      console.log('2. node src/scripts/updateNumbers4Data.js を実行');
      return;
    }
    
    const added = await addNewResults(newResults);
    console.log(`\n${added}件の新規データを追加しました`);
    
    // 現在の状態を表示
    const total = await DrawResult.countDocuments();
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const oldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    
    console.log(`\n現在のデータ: ${total}件`);
    console.log(`範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * スクレイピング関数のテンプレート
 * 実際のスクレイピング処理をここに実装
 */
async function scrapeLatestResults() {
  // オプション1: Puppeteerを使用（動的コンテンツ対応）
  // npm install puppeteer が必要
  
  // オプション2: 別のデータソースから取得
  // - 楽天宝くじ
  // - その他の宝くじ情報サイト
  
  // オプション3: 手動更新用のWebインターフェース
  // - 管理画面から手動で入力
  
  return []; // スクレイピングした結果を返す
}

/**
 * 定期実行用の関数
 * cronで実行することを想定
 */
async function scheduledUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`[${new Date().toISOString()}] 定期更新開始`);
    
    // スクレイピングを実行
    const newResults = await scrapeLatestResults();
    
    if (newResults.length > 0) {
      const added = await addNewResults(newResults);
      console.log(`${added}件の新規データを追加`);
    } else {
      console.log('新しいデータはありません');
    }
    
  } catch (error) {
    console.error('定期更新エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// コマンドライン引数で実行モードを選択
const mode = process.argv[2];

if (mode === 'scheduled') {
  scheduledUpdate();
} else {
  manualUpdate();
}

module.exports = {
  addNewResults,
  scrapeLatestResults,
  scheduledUpdate
};