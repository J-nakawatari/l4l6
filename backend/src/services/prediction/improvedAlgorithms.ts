import { IDrawResult } from '../../models/DrawResult';

// 遷移確率ベースの予測アルゴリズム
export function generateTransitionBasedPrediction(
  past100: IDrawResult[],
  lastDraw: IDrawResult
): string | null {
  if (!lastDraw) return null;
  
  // 位置ごとの遷移確率を計算
  const transitions: Record<string, Record<string, number>>[] = [{}, {}, {}, {}];
  
  for (let i = 0; i < past100.length - 1; i++) {
    const current = past100[i]!.winningNumber.split('');
    const next = past100[i + 1]!.winningNumber.split('');
    
    for (let pos = 0; pos < 4; pos++) {
      const key = current[pos]!;
      const nextDigit = next[pos]!;
      
      if (!transitions[pos]![key]) {
        transitions[pos]![key] = {};
      }
      transitions[pos]![key]![nextDigit] = (transitions[pos]![key]![nextDigit] || 0) + 1;
    }
  }
  
  // 最新の数字から次の数字を予測
  const lastDigits = lastDraw.winningNumber.split('');
  const prediction: string[] = [];
  
  for (let pos = 0; pos < 4; pos++) {
    const currentDigit = lastDigits[pos]!;
    const possibleNext = transitions[pos]![currentDigit];
    
    if (possibleNext && Object.keys(possibleNext).length > 0) {
      // 最も確率の高い遷移を選択
      const sorted = Object.entries(possibleNext).sort((a, b) => b[1] - a[1]);
      prediction.push(sorted[0]![0]);
    } else {
      // 遷移データがない場合は最頻出の数字を使用
      const freq: Record<string, number> = {};
      past100.forEach(d => {
        const digit = d.winningNumber[pos]!;
        freq[digit] = (freq[digit] || 0) + 1;
      });
      const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      prediction.push(sortedFreq[0]?.[0] || '0');
    }
  }
  
  return prediction.join('');
}

// 位置間相関を考慮した予測アルゴリズム
export function generateCorrelationBasedPrediction(past100: IDrawResult[]): string | null {
  // 位置間の相関をカウント
  const correlations: Record<string, number> = {};
  
  past100.forEach(result => {
    const digits = result.winningNumber.split('');
    
    // 全ての位置の組み合わせをカウント
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (i !== j) {
          const key = `${i}-${digits[i]}_${j}-${digits[j]}`;
          correlations[key] = (correlations[key] || 0) + 1;
        }
      }
    }
  });
  
  // 相関の強い組み合わせから予測を生成
  const prediction = ['', '', '', ''];
  const used = new Set<string>();
  
  // 各位置について相関の強い数字を選択
  for (let pos = 0; pos < 4; pos++) {
    const candidates: Record<string, number> = {};
    
    // この位置と相関の強い他の位置の数字を探す
    Object.entries(correlations).forEach(([key, count]) => {
      const match = key.match(/(\d)-(\d)_(\d)-(\d)/);
      if (match) {
        const [, , , pos2, digit2] = match;
        
        if (parseInt(pos2!) === pos && !used.has(digit2!)) {
          candidates[digit2!] = (candidates[digit2!] || 0) + count;
        }
      }
    });
    
    // 最も相関の強い数字を選択
    if (Object.keys(candidates).length > 0) {
      const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
      prediction[pos] = sorted[0]![0];
      used.add(sorted[0]![0]);
    } else {
      // 相関データがない場合はランダム
      let digit;
      do {
        digit = Math.floor(Math.random() * 10).toString();
      } while (used.has(digit));
      prediction[pos] = digit;
      used.add(digit);
    }
  }
  
  return prediction.join('');
}

// パターンベースの予測アルゴリズム
export function generatePatternBasedPrediction(past100: IDrawResult[]): string | null {
  // パターンの統計を収集
  const stats = {
    avgConsecutiveCount: 0,
    avgUniqueCount: 0,
    avgSum: 0,
    avgOddCount: 0
  };
  
  past100.forEach(result => {
    const digits = result.winningNumber.split('').map(Number);
    const uniqueDigits = new Set(digits);
    
    // 連続する数字のカウント
    const sorted = [...digits].sort((a, b) => a - b);
    let consecutiveCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1]! - sorted[i]! === 1) {
        consecutiveCount++;
      }
    }
    
    stats.avgConsecutiveCount += consecutiveCount;
    stats.avgUniqueCount += uniqueDigits.size;
    stats.avgSum += digits.reduce((a, b) => a + b, 0);
    stats.avgOddCount += digits.filter(d => d % 2 === 1).length;
  });
  
  // 平均値を計算
  const len = past100.length;
  stats.avgConsecutiveCount /= len;
  stats.avgUniqueCount /= len;
  stats.avgSum /= len;
  stats.avgOddCount /= len;
  
  // パターンに基づいて予測を生成
  let attempts = 0;
  while (attempts < 100) {
    const prediction: number[] = [];
    const used = new Set<number>();
    
    // 平均的なユニーク数に近づける
    const targetUnique = Math.round(stats.avgUniqueCount);
    
    for (let i = 0; i < 4; i++) {
      let digit: number;
      
      if (used.size < targetUnique && i < targetUnique) {
        // ユニークな数字を生成
        do {
          digit = Math.floor(Math.random() * 10);
        } while (used.has(digit));
      } else {
        // 既存の数字から選択
        const existing = Array.from(used);
        digit = existing[Math.floor(Math.random() * existing.length)] || 0;
      }
      
      prediction.push(digit);
      used.add(digit);
    }
    
    // 合計値が平均に近いかチェック
    const sum = prediction.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - stats.avgSum) < 5) {
      return prediction.join('');
    }
    
    attempts++;
  }
  
  // デフォルト
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// ハイブリッド予測アルゴリズム（複数のアルゴリズムを組み合わせ）
export function generateHybridPrediction(
  past100: IDrawResult[],
  lastDraw: IDrawResult
): string[] {
  const predictions: string[] = [];
  const usedPredictions = new Set<string>();
  
  // 1. 遷移確率ベースの予測
  const transitionPred = generateTransitionBasedPrediction(past100, lastDraw);
  if (transitionPred && !usedPredictions.has(transitionPred)) {
    predictions.push(transitionPred);
    usedPredictions.add(transitionPred);
  }
  
  // 2. 相関ベースの予測
  const correlationPred = generateCorrelationBasedPrediction(past100);
  if (correlationPred && !usedPredictions.has(correlationPred)) {
    predictions.push(correlationPred);
    usedPredictions.add(correlationPred);
  }
  
  // 3. パターンベースの予測
  for (let i = 0; i < 3; i++) {
    const patternPred = generatePatternBasedPrediction(past100);
    if (patternPred && !usedPredictions.has(patternPred)) {
      predictions.push(patternPred);
      usedPredictions.add(patternPred);
    }
  }
  
  // 4. 従来のKako予測も追加
  const kakoPred = generateKakoPrediction(past100);
  if (kakoPred && !usedPredictions.has(kakoPred)) {
    predictions.push(kakoPred);
    usedPredictions.add(kakoPred);
  }
  
  // 残りはランダムバリエーション
  while (predictions.length < 12) {
    const randomPred = generateRandomVariation(past100, usedPredictions);
    if (randomPred) {
      predictions.push(randomPred);
      usedPredictions.add(randomPred);
    }
  }
  
  return predictions.slice(0, 12);
}

// 従来のKakoアルゴリズム
function generateKakoPrediction(past100: IDrawResult[]): string | null {
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[3-i];
      if (digit !== undefined) {
        freq[i]![digit] = (freq[i]![digit] || 0) + 1;
      }
    }
  });
  
  const most: string[] = [];
  for (let idx = 0; idx < 4; idx++) {
    const freqData = freq[idx]!;
    const sorted = Object.entries(freqData).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (sorted.length > 0) {
      most.push(sorted[0]![0]);
    }
  }
  
  if (most.length === 4) {
    return most.join('');
  }
  return null;
}

// ランダムバリエーション生成
function generateRandomVariation(
  past100: IDrawResult[],
  used: Set<string>
): string | null {
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[i];
      if (digit !== undefined) {
        freq[i]![digit] = (freq[i]![digit] || 0) + 1;
      }
    }
  });
  
  let attempts = 0;
  while (attempts < 10) {
    const prediction: string[] = [];
    
    for (let pos = 0; pos < 4; pos++) {
      if (Math.random() < 0.7) {
        // 70%の確率で頻度ベース
        const sorted = Object.entries(freq[pos]!).sort((a, b) => b[1] - a[1]);
        const topThree = sorted.slice(0, 3);
        if (topThree.length > 0) {
          const selected = topThree[Math.floor(Math.random() * topThree.length)]!;
          prediction.push(selected[0]);
        } else {
          prediction.push(Math.floor(Math.random() * 10).toString());
        }
      } else {
        // 30%の確率でランダム
        prediction.push(Math.floor(Math.random() * 10).toString());
      }
    }
    
    const result = prediction.join('');
    if (!used.has(result)) {
      return result;
    }
    
    attempts++;
  }
  
  return null;
}