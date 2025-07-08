import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { DrawResult } from '../models/DrawResult';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// 実際のNumbers4のような分布でサンプルデータを生成
async function generateAndSaveData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('データベースに接続しました');

    // 150回分のサンプルデータを生成
    const today = new Date();
    let savedCount = 0;

    for (let i = 0; i < 150; i++) {
      const drawDate = new Date(today);
      drawDate.setDate(drawDate.getDate() - i);

      // より現実的な分布を作るため、特定の数字を頻出させる
      const digit1 = weightedRandom([2, 3, 4], [30, 25, 20]); // 1の位
      const digit2 = weightedRandom([5, 6, 7], [35, 25, 20]); // 10の位
      const digit3 = weightedRandom([7, 8, 9], [30, 30, 20]); // 100の位
      const digit4 = weightedRandom([1, 2, 3], [35, 30, 25]); // 1000の位

      const winningNumber = `${digit4}${digit3}${digit2}${digit1}`;

      try {
        await DrawResult.create({
          drawNumber: 5500 - i,
          drawDate,
          winningNumber,
          prize: {
            amount: 900000,
            winners: Math.floor(Math.random() * 5) + 1
          },
          fetchedAt: new Date()
        });
        savedCount++;
      } catch (err) {
        // 重複エラーはスキップ
      }
    }

    console.log(`${savedCount}件のサンプルデータを生成しました`);

    // 統計を表示
    const allData = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
    const digitFreq = [{}, {}, {}, {}] as any[];

    allData.forEach((draw: any) => {
      const num = draw.winningNumber.padStart(4, '0');
      for (let i = 0; i < 4; i++) {
        const digit = num[3 - i];
        digitFreq[i][digit] = (digitFreq[i][digit] || 0) + 1;
      }
    });

    console.log('\n過去100回の頻度分析:');
    ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
      const sorted = Object.entries(digitFreq[idx])
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3);
      console.log(`${pos}: ${sorted.map(([d, c]) => `${d}(${c}回)`).join(', ')}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 重み付きランダム選択
function weightedRandom(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < values.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return values[i];
    }
  }
  
  // 残りはランダム
  return Math.floor(Math.random() * 10);
}

generateAndSaveData();