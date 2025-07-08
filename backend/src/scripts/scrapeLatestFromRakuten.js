const mongoose = require('mongoose');
require('dotenv').config();

const DrawResultSchema = new mongoose.Schema({
  drawNumber: { type: Number, unique: true },
  drawDate: Date,
  winningNumber: String,
  prize: {
    amount: Number,
    winners: Number
  },
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

// 手動で確認した最新データ（2025年7月）
const latestData = [
  { drawNumber: 6764, drawDate: new Date(2025, 6, 8), winningNumber: '2982' },
  { drawNumber: 6763, drawDate: new Date(2025, 6, 7), winningNumber: '9181' },
  { drawNumber: 6762, drawDate: new Date(2025, 6, 4), winningNumber: '2452' },
  { drawNumber: 6761, drawDate: new Date(2025, 6, 3), winningNumber: '1479' },
  { drawNumber: 6760, drawDate: new Date(2025, 6, 2), winningNumber: '3099' },
  { drawNumber: 6759, drawDate: new Date(2025, 6, 1), winningNumber: '5261' },
];

async function addLatestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('最新データを追加中...\n');
    
    let added = 0;
    for (const data of latestData) {
      try {
        await DrawResult.create({
          ...data,
          prize: { amount: 900000, winners: 1 },
          fetchedAt: new Date()
        });
        console.log(`追加: 第${data.drawNumber}回 (${data.drawDate.toLocaleDateString('ja-JP')}): ${data.winningNumber}`);
        added++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`スキップ: 第${data.drawNumber}回 (既存)`);
        }
      }
    }
    
    console.log(`\n${added}件の新規データを追加`);
    
    // データベースの状態を確認
    const total = await DrawResult.countDocuments();
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const gapStart = await DrawResult.findOne({ drawNumber: 2700 });
    
    console.log(`\n総データ数: ${total}件`);
    console.log(`最新: 第${newest.drawNumber}回 (${newest.drawDate.toLocaleDateString('ja-JP')})`);
    
    if (gapStart && newest.drawNumber > 2700) {
      console.log(`\n注意: 第2701回～第${newest.drawNumber - 1}回のデータが不足しています`);
      console.log(`不足データ数: ${newest.drawNumber - 2700 - latestData.length}件`);
    }
    
    // 最新データでKakoアルゴリズムを再実行
    console.log('\n=== 最新100回でのKako分析 ===');
    const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
    
    if (past100.length >= 100) {
      const freq = [{}, {}, {}, {}];
      
      past100.forEach(d => {
        const n = d.winningNumber;
        for (let i = 0; i < 4; i++) {
          const digit = n[3-i];
          freq[i][digit] = (freq[i][digit] || 0) + 1;
        }
      });
      
      const most = [];
      ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
        const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
        console.log(`${pos}: ${sorted[0][0]}（${sorted[0][1]}回）`);
        most.push(sorted[0][0]);
      });
      
      const prediction = most[0] + most[1] + most[2] + most[3];
      console.log(`\nKako予想: ${prediction}`);
      
      // 最新6回での検証
      console.log('\n最新6回での当選チェック:');
      let hits = 0;
      
      latestData.forEach(d => {
        if (d.winningNumber === prediction) {
          console.log(`第${d.drawNumber}回: ストレート当選！`);
          hits++;
        } else if (d.winningNumber.split('').sort().join('') === prediction.split('').sort().join('')) {
          console.log(`第${d.drawNumber}回: ボックス当選！`);
          hits++;
        }
      });
      
      if (hits === 0) {
        console.log('当選なし');
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

addLatestData();