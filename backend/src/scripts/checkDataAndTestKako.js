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

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const total = await DrawResult.countDocuments();
    const oldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log('=== データベース状況 ===');
    console.log(`総データ数: ${total}件`);
    
    if (oldest && newest) {
      console.log(`データ範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
      console.log(`期間: ${oldest.drawDate.toLocaleDateString('ja-JP')} ～ ${newest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
    // 最新20件を表示
    console.log('\n=== 最新20件 ===');
    const latest20 = await DrawResult.find().sort({ drawNumber: -1 }).limit(20);
    latest20.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
    });
    
    // Kakoアルゴリズムの実行
    console.log('\n=== Kakoアルゴリズム分析 ===');
    const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
    
    if (past100.length < 100) {
      console.log('データが100件未満のため分析できません');
      return;
    }
    
    // 各位の頻度を計算
    const freq = [{}, {}, {}, {}];
    
    past100.forEach(d => {
      const n = d.winningNumber;
      for (let i = 0; i < 4; i++) {
        const digit = n[3-i]; // 右から数える（1の位、10の位、100の位、1000の位）
        freq[i][digit] = (freq[i][digit] || 0) + 1;
      }
    });
    
    // 各位の最頻出数字を表示
    console.log('\n過去100回の各位の最頻出数字:');
    const most = [];
    ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
      const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
      console.log(`\n${pos}:`);
      sorted.slice(0, 5).forEach(([digit, count]) => {
        console.log(`  ${digit}: ${count}回 (${(count/100*100).toFixed(1)}%)`);
      });
      most.push(sorted[0][0]);
    });
    
    // Kako予想を生成
    const basePrediction = most[0] + most[1] + most[2] + most[3];
    console.log(`\n=== Kako基本予想: ${basePrediction} ===`);
    
    // 過去10回での検証
    console.log('\n=== 過去10回での当選チェック ===');
    const latest10 = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    let straightHits = 0;
    let boxHits = 0;
    
    latest10.forEach(d => {
      if (d.winningNumber === basePrediction) {
        console.log(`第${d.drawNumber}回 (${d.winningNumber}): ストレート当選！`);
        straightHits++;
      }
      
      const sorted1 = d.winningNumber.split('').sort().join('');
      const sorted2 = basePrediction.split('').sort().join('');
      if (sorted1 === sorted2) {
        console.log(`第${d.drawNumber}回 (${d.winningNumber}): ボックス当選！`);
        boxHits++;
      }
    });
    
    console.log(`\n結果: ストレート ${straightHits}/10 (${straightHits*10}%), ボックス ${boxHits}/10 (${boxHits*10}%)`);
    
    if (straightHits === 0 && boxHits === 0) {
      console.log('\n過去10回では当選なし（統計的に普通です）');
    }
    
    // より詳細な分析
    console.log('\n=== 詳細分析 ===');
    console.log('過去100回で最も多い組み合わせ:');
    const combos = {};
    past100.forEach(d => {
      combos[d.winningNumber] = (combos[d.winningNumber] || 0) + 1;
    });
    
    const sortedCombos = Object.entries(combos).sort((a, b) => b[1] - a[1]);
    sortedCombos.slice(0, 5).forEach(([num, count]) => {
      if (count > 1) {
        console.log(`  ${num}: ${count}回`);
      }
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();