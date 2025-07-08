const mongoose = require('mongoose');
require('dotenv').config();

const DrawResultSchema = new mongoose.Schema({
  drawNumber: Number,
  drawDate: Date,
  winningNumber: String,
  prize: {
    straight: { winners: Number, amount: Number },
    box: { winners: Number, amount: Number }
  }
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

async function checkFixedPredictions() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // 固定の12個の予想
  const fixedPredictions = [
    '4729', '8516', '3074', '9182', '6358', '1923',
    '7640', '2895', '5167', '0432', '8709', '3251'
  ];
  
  // 2025年1月以降の抽選結果を取得
  const results2025 = await DrawResult.find({
    drawDate: { $gte: new Date('2025-01-01') }
  }).sort({ drawNumber: 1 });
  
  console.log('\n=== 2025年1月からの抽選結果に対する固定12個の予想チェック ===\n');
  console.log('固定予想: ' + fixedPredictions.join(', '));
  console.log('\n抽選回数: ' + results2025.length + '回\n');
  
  let totalWins = 0;
  let straightWins = 0;
  let boxWins = 0;
  const winDetails = [];
  
  // 各抽選結果をチェック
  for (const draw of results2025) {
    for (const prediction of fixedPredictions) {
      // ストレート判定
      if (prediction === draw.winningNumber) {
        winDetails.push({
          drawNumber: draw.drawNumber,
          drawDate: draw.drawDate,
          winningNumber: draw.winningNumber,
          prediction: prediction,
          winType: 'ストレート',
          theoretical: 900000
        });
        totalWins++;
        straightWins++;
      }
      // ボックス判定
      else {
        const predDigits = prediction.split('').sort().join('');
        const winDigits = draw.winningNumber.split('').sort().join('');
        if (predDigits === winDigits) {
          winDetails.push({
            drawNumber: draw.drawNumber,
            drawDate: draw.drawDate,
            winningNumber: draw.winningNumber,
            prediction: prediction,
            winType: 'ボックス',
            theoretical: 37500
          });
          totalWins++;
          boxWins++;
        }
      }
    }
  }
  
  // 結果表示
  if (winDetails.length > 0) {
    console.log('🎉 当選がありました！\n');
    console.log('抽選回\t抽選日\t\t当選番号\t予想\t\t当選タイプ\t理論値');
    console.log('-------\t--------\t--------\t----\t\t----------\t------');
    for (const win of winDetails) {
      console.log(
        `第${win.drawNumber}回\t${win.drawDate.toLocaleDateString('ja-JP')}\t${win.winningNumber}\t\t${win.prediction}\t\t${win.winType}\t${win.theoretical.toLocaleString()}円`
      );
    }
  } else {
    console.log('❌ 残念ながら当選はありませんでした。');
  }
  
  console.log('\n------ 集計 ------');
  console.log(`総当選数: ${totalWins}回`);
  console.log(`ストレート: ${straightWins}回`);
  console.log(`ボックス: ${boxWins}回`);
  console.log(`的中率: ${((totalWins / (results2025.length * 12)) * 100).toFixed(2)}%`);
  console.log(`理論値収支: +${winDetails.reduce((sum, w) => sum + w.theoretical, 0).toLocaleString()}円`);
  console.log(`購入金額: -${(results2025.length * 12 * 200).toLocaleString()}円`);
  console.log(`最終収支: ${(winDetails.reduce((sum, w) => sum + w.theoretical, 0) - (results2025.length * 12 * 200)).toLocaleString()}円`);
  
  await mongoose.disconnect();
}

checkFixedPredictions();