import { DrawResult } from '../models/DrawResult';
import { generateKakoPredictions, getKakoAnalysis } from '../services/prediction/kakoPrediction';
import { checkPredictions, countHits } from '../utils/lottery';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testKakoAlgorithm() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotto-prediction');
    console.log('MongoDB connected');

    // 最新の10回分の抽選結果を取得
    const recent10Draws = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(10)
      .select('drawNumber drawDate winningNumber');

    if (recent10Draws.length === 0) {
      console.log('No draw results found in database');
      return;
    }

    console.log('=== 過去10回の当選結果に対するKakoアルゴリズムの検証 ===\n');

    let totalStraight = 0;
    let totalBox = 0;
    let totalBoxOnly = 0;

    // 各抽選回について検証
    for (const draw of recent10Draws.reverse()) {
      console.log(`\n--- 第${draw.drawNumber}回 (${draw.drawDate.toLocaleDateString('ja-JP')}) ---`);
      console.log(`当選番号: ${draw.winningNumber}`);
      
      // その回より前の100回分のデータで予想を生成
      const historicalData = await DrawResult.find({
        drawNumber: { $lt: draw.drawNumber }
      })
        .sort({ drawNumber: -1 })
        .limit(100);

      if (historicalData.length < 50) {
        console.log('過去データが不足しているためスキップ');
        continue;
      }

      // 一時的にDrawResultコレクションを使って予想を生成
      const originalFind = DrawResult.find;
      DrawResult.find = () => ({
        sort: () => ({
          limit: () => ({
            select: () => Promise.resolve(historicalData)
          })
        })
      }) as any;

      // Kakoアルゴリズムで予想を生成
      const predictions = await generateKakoPredictions();
      
      // 元に戻す
      DrawResult.find = originalFind;

      console.log(`予想番号: ${predictions.join(', ')}`);

      // 当選チェック
      const results = checkPredictions(predictions, draw.winningNumber);
      const hits = countHits(results);

      console.log(`結果: ストレート ${hits.straight}個, ボックス ${hits.box}個 (ボックスのみ ${hits.boxOnly}個)`);

      // 当選した番号を表示
      results.forEach(result => {
        if (result.isStraight) {
          console.log(`  ✓ ストレート当選: ${result.prediction}`);
        } else if (result.isBox) {
          console.log(`  ✓ ボックス当選: ${result.prediction}`);
        }
      });

      totalStraight += hits.straight;
      totalBox += hits.box;
      totalBoxOnly += hits.boxOnly;
    }

    console.log('\n=== 総合結果 ===');
    console.log(`ストレート当選: ${totalStraight}個`);
    console.log(`ボックス当選: ${totalBox}個 (ボックスのみ: ${totalBoxOnly}個)`);
    console.log(`検証回数: ${recent10Draws.length}回`);

    // 頻度分析も表示
    console.log('\n=== 現在の頻度分析（過去100回） ===');
    const analysis = await getKakoAnalysis();
    console.log(`サンプル数: ${analysis.sampleSize}回`);
    console.log(`最頻出数字: ${analysis.mostFrequent.join('')}`);
    
    ['1の位', '10の位', '100の位', '1000の位'].forEach((position, index) => {
      console.log(`\n${position}:`);
      analysis.digitFrequency[index].slice(0, 3).forEach(({ digit, count, percentage }) => {
        console.log(`  ${digit}: ${count}回 (${percentage}%)`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// スクリプトを実行
testKakoAlgorithm();