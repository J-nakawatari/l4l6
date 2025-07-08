import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkKakoPerformance() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('データベースに接続しました');

    // DrawResultモデルを取得
    const DrawResult = mongoose.model('DrawResult');

    // 最新10件の抽選結果を取得
    const recentDraws = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(10)
      .select('drawNumber winningNumber drawDate');

    console.log(`\n過去10回の抽選結果を取得しました（件数: ${recentDraws.length}）`);

    if (recentDraws.length === 0) {
      console.log('データが見つかりませんでした');
      return;
    }

    // 各桁の頻度を計算（過去100回分）
    const allDraws = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(100)
      .select('winningNumber');

    const digitFrequency = [{}, {}, {}, {}] as Array<Record<string, number>>;

    allDraws.forEach((draw: any) => {
      const number = draw.winningNumber.padStart(4, '0');
      for (let i = 0; i < 4; i++) {
        const digit = number[3 - i];
        digitFrequency[i][digit] = (digitFrequency[i][digit] || 0) + 1;
      }
    });

    // 最頻出数字を特定
    const mostFrequent = digitFrequency.map(freq => {
      let maxCount = 0;
      let mostFrequentDigit = '0';
      Object.entries(freq).forEach(([digit, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostFrequentDigit = digit;
        }
      });
      return mostFrequentDigit;
    });

    console.log(`\n過去100回の最頻出数字: ${mostFrequent[0]}${mostFrequent[1]}${mostFrequent[2]}${mostFrequent[3]}`);

    // 簡易的な当選チェック
    console.log('\n過去10回での当選チェック:');
    let straightCount = 0;
    let boxCount = 0;

    recentDraws.forEach((draw: any) => {
      const winning = draw.winningNumber;
      const prediction = mostFrequent[0] + mostFrequent[1] + mostFrequent[2] + mostFrequent[3];
      
      if (winning === prediction) {
        straightCount++;
        console.log(`第${draw.drawNumber}回: ストレート当選！`);
      }
      
      const winningSorted = winning.split('').sort().join('');
      const predictionSorted = prediction.split('').sort().join('');
      if (winningSorted === predictionSorted) {
        boxCount++;
        console.log(`第${draw.drawNumber}回: ボックス当選！`);
      }
    });

    console.log(`\n結果: ストレート ${straightCount}回, ボックス ${boxCount}回`);

  } catch (error) {
    console.error('エラーが発生しました:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await mongoose.disconnect();
    console.log('\nデータベース接続を終了しました');
  }
}

checkKakoPerformance();