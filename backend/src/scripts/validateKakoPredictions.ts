import mongoose from 'mongoose';
import { DrawResult } from '../models/DrawResult';
import dotenv from 'dotenv';

dotenv.config();

interface ValidationResult {
  drawNumber: number;
  drawDate: Date;
  winningNumber: string;
  predictions: string[];
  straightHit: boolean;
  boxHit: boolean;
  matchedPrediction?: string;
}

// ボックス判定用のヘルパー関数
function isBoxMatch(prediction: string, winningNumber: string): boolean {
  const predSorted = prediction.split('').sort().join('');
  const winningSorted = winningNumber.split('').sort().join('');
  return predSorted === winningSorted;
}

async function simulateKakoPrediction(beforeDrawNumber: number): Promise<string[]> {
  // 指定された抽選回より前の100回分のデータを取得
  const historicalData = await DrawResult.find({ drawNumber: { $lt: beforeDrawNumber } })
    .sort({ drawNumber: -1 })
    .limit(100)
    .select('winningNumber');

  if (historicalData.length === 0) {
    return [];
  }

  // 各桁の頻度を計算
  const digitFrequency: Array<Record<string, number>> = [
    {}, // 1の位
    {}, // 10の位
    {}, // 100の位
    {}, // 1000の位
  ];

  // 初期化
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= 9; j++) {
      if (digitFrequency[i]) {
        digitFrequency[i]![j.toString()] = 0;
      }
    }
  }

  // 各桁の出現回数をカウント
  historicalData.forEach(result => {
    const number = result.winningNumber.padStart(4, '0');
    
    for (let i = 0; i < 4; i++) {
      const digit = number[3 - i]; // 右から数える（1の位から）
      if (digitFrequency[i] && digit !== undefined) {
        digitFrequency[i]![digit] = (digitFrequency[i]![digit] ?? 0) + 1;
      }
    }
  });

  // 各桁で最も頻出する数字を取得
  const mostFrequentDigits: string[] = digitFrequency.map(freq => {
    let maxCount = 0;
    let mostFrequent = '0';
    
    Object.entries(freq).forEach(([digit, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = digit;
      }
    });
    
    return mostFrequent;
  });

  // 基本予想（最頻出数字の組み合わせ）
  const basePrediction = (mostFrequentDigits[3] ?? '0') + (mostFrequentDigits[2] ?? '0') + 
                        (mostFrequentDigits[1] ?? '0') + (mostFrequentDigits[0] ?? '0');

  // 予想結果を生成（並び替えパターン）
  const predictions: Set<string> = new Set();
  
  // 1. 基本予想
  predictions.add(basePrediction);

  // 2. 各桁の2番目に多い数字も取得して組み合わせを作る
  const secondFrequentDigits: string[] = digitFrequency.map(freq => {
    const sorted = Object.entries(freq)
      .sort(([, a], [, b]) => b - a);
    
    return sorted.length > 1 ? sorted[1]?.[0] ?? '0' : sorted[0]?.[0] ?? '0';
  });

  // 3. 最頻出と2番目の組み合わせパターンを生成
  for (let i = 0; i < 4; i++) {
    const pattern = [...mostFrequentDigits];
    pattern[i] = secondFrequentDigits[i] ?? '0';
    predictions.add((pattern[3] ?? '0') + (pattern[2] ?? '0') + (pattern[1] ?? '0') + (pattern[0] ?? '0'));
  }

  // 4. 順列の一部を生成（最大10個まで）
  const digits = [mostFrequentDigits[0] ?? '0', mostFrequentDigits[1] ?? '0', 
                 mostFrequentDigits[2] ?? '0', mostFrequentDigits[3] ?? '0'];
  
  // 重複を除いた数字の配列
  const uniqueDigits = [...new Set(digits)];
  
  if (uniqueDigits.length >= 4) {
    // 4つ以上異なる数字がある場合は順列を生成
    generatePermutations(uniqueDigits.slice(0, 4), predictions, 10);
  } else {
    // 重複がある場合は、2番目に多い数字を混ぜて予想を生成
    for (let i = 0; i < 4 && predictions.size < 10; i++) {
      const mixed = [...mostFrequentDigits];
      mixed[i] = secondFrequentDigits[i] ?? '0';
      
      // 位置を入れ替えたパターンも追加
      for (let j = 0; j < 4 && predictions.size < 10; j++) {
        if (i !== j) {
          [mixed[i], mixed[j]] = [mixed[j] ?? '0', mixed[i] ?? '0'];
          predictions.add((mixed[3] ?? '0') + (mixed[2] ?? '0') + (mixed[1] ?? '0') + (mixed[0] ?? '0'));
        }
      }
    }
  }

  return Array.from(predictions).slice(0, 10);
}

function generatePermutations(arr: string[], results: Set<string>, maxCount: number): void {
  function permute(arr: string[], m: string[] = []): void {
    if (results.size >= maxCount) return;
    
    if (arr.length === 0) {
      results.add(m.join(''));
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next));
      }
    }
  }
  
  permute(arr);
}

async function validateKakoPredictions() {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lotto4life');
    console.log('Connected to MongoDB');

    // 最新10回分の抽選結果を取得
    const recentDraws = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(10)
      .select('drawNumber drawDate winningNumber');

    if (recentDraws.length === 0) {
      console.log('No draw results found in database');
      return;
    }

    console.log(`\n=== 過去10回分の抽選結果に対するKako予想アルゴリズムの検証 ===\n`);

    const results: ValidationResult[] = [];
    let straightHitCount = 0;
    let boxHitCount = 0;

    // 各抽選回について検証
    for (const draw of recentDraws.reverse()) {
      // その回の抽選より前のデータを使って予想を生成
      const predictions = await simulateKakoPrediction(draw.drawNumber);
      
      // 予想が当選番号と一致するかチェック
      let straightHit = false;
      let boxHit = false;
      let matchedPrediction: string | undefined;

      for (const pred of predictions) {
        if (pred === draw.winningNumber) {
          straightHit = true;
          matchedPrediction = pred;
          break;
        } else if (isBoxMatch(pred, draw.winningNumber)) {
          boxHit = true;
          matchedPrediction = pred;
        }
      }

      if (straightHit) straightHitCount++;
      if (boxHit || straightHit) boxHitCount++;

      results.push({
        drawNumber: draw.drawNumber,
        drawDate: draw.drawDate,
        winningNumber: draw.winningNumber,
        predictions,
        straightHit,
        boxHit: boxHit || straightHit,
        matchedPrediction
      });

      // 詳細を表示
      console.log(`抽選回: ${draw.drawNumber} (${draw.drawDate.toLocaleDateString('ja-JP')})`);
      console.log(`当選番号: ${draw.winningNumber}`);
      console.log(`予想番号: ${predictions.join(', ')}`);
      console.log(`結果: ${straightHit ? '✅ ストレート的中!' : boxHit ? '🔸 ボックス的中' : '❌ 不的中'}`);
      if (matchedPrediction) {
        console.log(`的中した予想: ${matchedPrediction}`);
      }
      console.log('---');
    }

    // サマリー
    console.log(`\n=== 検証結果サマリー ===`);
    console.log(`総検証回数: ${results.length}回`);
    console.log(`ストレート的中: ${straightHitCount}回 (${(straightHitCount / results.length * 100).toFixed(1)}%)`);
    console.log(`ボックス的中: ${boxHitCount}回 (${(boxHitCount / results.length * 100).toFixed(1)}%)`);
    console.log(`完全不的中: ${results.length - boxHitCount}回 (${((results.length - boxHitCount) / results.length * 100).toFixed(1)}%)`);

    // 的中詳細
    const hits = results.filter(r => r.straightHit || r.boxHit);
    if (hits.length > 0) {
      console.log(`\n=== 的中詳細 ===`);
      hits.forEach(hit => {
        console.log(`第${hit.drawNumber}回 - ${hit.winningNumber} - ${hit.straightHit ? 'ストレート' : 'ボックス'} - 予想: ${hit.matchedPrediction}`);
      });
    }

    // 理論的中確率との比較
    console.log(`\n=== 理論確率との比較 ===`);
    console.log(`ストレート理論確率: 0.1% (1/10,000)`);
    console.log(`実際の的中率: ${(straightHitCount / results.length * 100).toFixed(1)}%`);
    console.log(`ボックス理論確率: 約0.4-2.4% (組み合わせによる)`);
    console.log(`実際の的中率: ${(boxHitCount / results.length * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
validateKakoPredictions().catch(console.error);