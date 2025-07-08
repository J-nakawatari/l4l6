const mongoose = require('mongoose');
require('dotenv').config();

// DrawResultスキーマ
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
 * Kakoアルゴリズムで予想を生成
 * @param {Array} past100 - 過去100回のデータ
 * @returns {Object} 予想結果
 */
function generateKakoPrediction(past100) {
  // 各位の頻度を計算
  const freq = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[3-i]; // 右から数える（1の位、10の位、100の位、1000の位）
      freq[i][digit] = (freq[i][digit] || 0) + 1;
    }
  });
  
  // 各位の最頻出数字を取得
  const most = [];
  const details = [];
  
  ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
    const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
    most.push(sorted[0][0]);
    details.push({
      position: pos,
      mostFrequent: sorted[0][0],
      count: sorted[0][1],
      percentage: (sorted[0][1] / 100 * 100).toFixed(1),
      top3: sorted.slice(0, 3).map(([digit, count]) => ({ digit, count }))
    });
  });
  
  // 基本予想を生成
  const basePrediction = most[0] + most[1] + most[2] + most[3];
  
  return {
    basePrediction,
    details
  };
}

/**
 * 当選チェック
 */
async function testKakoAlgorithm() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Kakoアルゴリズム検証 ===');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}\n`);
    
    // 最新110件を取得（過去100件で予想、10件で検証）
    const latest110 = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(110);
    
    if (latest110.length < 110) {
      console.log('データが不足しています（110件必要）');
      return;
    }
    
    // 過去10回分を検証対象とする
    const testData = latest110.slice(0, 10);
    const past100 = latest110.slice(10, 110);
    
    console.log(`検証対象: 第${testData[testData.length-1].drawNumber}回～第${testData[0].drawNumber}回`);
    console.log(`予想データ: 第${past100[past100.length-1].drawNumber}回～第${past100[0].drawNumber}回の100回\n`);
    
    // Kako予想を生成
    const prediction = generateKakoPrediction(past100);
    
    console.log('=== Kakoアルゴリズム分析結果 ===');
    prediction.details.forEach(detail => {
      console.log(`\n${detail.position}:`);
      console.log(`  最頻出: ${detail.mostFrequent} (${detail.count}回, ${detail.percentage}%)`);
      console.log(`  TOP3: ${detail.top3.map(d => `${d.digit}(${d.count}回)`).join(', ')}`);
    });
    
    console.log(`\n基本予想: ${prediction.basePrediction}`);
    console.log('=' * 40 + '\n');
    
    // 過去10回での検証
    console.log('=== 過去10回での当選チェック ===');
    let straightHits = 0;
    let boxHits = 0;
    const hitDetails = [];
    
    testData.forEach(d => {
      const isStraight = d.winningNumber === prediction.basePrediction;
      const isBox = d.winningNumber.split('').sort().join('') === 
                    prediction.basePrediction.split('').sort().join('');
      
      if (isStraight) {
        straightHits++;
        hitDetails.push({
          drawNumber: d.drawNumber,
          date: d.drawDate,
          winningNumber: d.winningNumber,
          type: 'ストレート',
          prize: d.prize.straight
        });
        console.log(`✅ 第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber} - ストレート当選！`);
        if (d.prize.straight.amount > 0) {
          console.log(`   賞金: ${d.prize.straight.amount.toLocaleString()}円 (${d.prize.straight.winners}口)`);
        }
      } else if (isBox) {
        boxHits++;
        hitDetails.push({
          drawNumber: d.drawNumber,
          date: d.drawDate,
          winningNumber: d.winningNumber,
          type: 'ボックス',
          prize: d.prize.box
        });
        console.log(`📦 第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber} - ボックス当選！`);
        if (d.prize.box.amount > 0) {
          console.log(`   賞金: ${d.prize.box.amount.toLocaleString()}円 (${d.prize.box.winners}口)`);
        }
      } else {
        console.log(`❌ 第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
      }
    });
    
    // 結果サマリー
    console.log('\n=== 検証結果サマリー ===');
    console.log(`ストレート: ${straightHits}/10 (${straightHits * 10}%)`);
    console.log(`ボックス: ${boxHits}/10 (${boxHits * 10}%)`);
    console.log(`合計当選: ${straightHits + boxHits}/10 (${(straightHits + boxHits) * 10}%)`);
    
    // 期待値計算（参考）
    console.log('\n=== 期待値分析（参考）===');
    console.log('理論的確率:');
    console.log('  ストレート: 1/10,000 (0.01%)');
    console.log('  ボックス（全て異なる数字）: 24/10,000 (0.24%)');
    
    if (straightHits > 0 || boxHits > 0) {
      console.log('\n🎉 Kakoアルゴリズムで当選がありました！');
      
      // 当選詳細
      console.log('\n当選詳細:');
      hitDetails.forEach(hit => {
        console.log(`- 第${hit.drawNumber}回: ${hit.type}当選`);
      });
    } else {
      console.log('\n今回の検証では当選はありませんでした。');
      console.log('（統計的に正常な結果です）');
    }
    
    // 予想番号の各数字の出現頻度
    console.log('\n=== 予想番号の分析 ===');
    const predDigits = prediction.basePrediction.split('');
    console.log(`予想番号: ${prediction.basePrediction}`);
    console.log('各数字の選出理由:');
    predDigits.forEach((digit, idx) => {
      const pos = ['1の位', '10の位', '100の位', '1000の位'][idx];
      const detail = prediction.details[idx];
      console.log(`  ${pos}の"${digit}": 過去100回で${detail.count}回出現（${detail.percentage}%）`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
testKakoAlgorithm();