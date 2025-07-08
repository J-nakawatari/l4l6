import { DrawResult } from '../../models/DrawResult';

/**
 * 過去実績予想アルゴリズム
 * 過去100回のデータから各桁で最も頻出する数字を抽出して予想を生成
 */
export async function generateKakoPredictions(): Promise<string[]> {
  try {
    // 過去100回の抽選結果を取得
    const historicalData = await DrawResult.find()
      .sort({ drawDate: -1 })
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

    // 各桁の出現回数をカウント
    historicalData.forEach(result => {
      const number = result.winningNumber.padStart(4, '0');
      
      for (let i = 0; i < 4; i++) {
        const digit = number[3 - i]; // 右から数える（1の位から）
        if (digitFrequency[i] && digit) {
          digitFrequency[i]![digit] = (digitFrequency[i]![digit] || 0) + 1;
        }
      }
    });

    // 各桁で最も頻出する数字を取得
    const mostFrequentDigits = digitFrequency.map(freq => {
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
    // 1の位から順に並べる（2, 5, 7, 9 → 2579）
    const basePrediction = (mostFrequentDigits[0] || '0') + (mostFrequentDigits[1] || '0') + 
                          (mostFrequentDigits[2] || '0') + (mostFrequentDigits[3] || '0');

    // 予想結果を生成（並び替えパターン）
    const predictions: Set<string> = new Set();
    
    // 1. 基本予想
    predictions.add(basePrediction);

    // 2. 各桁の2番目に多い数字も取得して組み合わせを作る
    const secondFrequentDigits = digitFrequency.map(freq => {
      const sorted = Object.entries(freq)
        .sort(([, a], [, b]) => b - a);
      
      return sorted.length > 1 ? sorted[1]![0] : sorted[0]![0];
    });

    // 3. 最頻出と2番目の組み合わせパターンを生成
    for (let i = 0; i < 4; i++) {
      const pattern = [...mostFrequentDigits];
      pattern[i] = secondFrequentDigits[i] || '0';
      predictions.add((pattern[0] || '0') + (pattern[1] || '0') + (pattern[2] || '0') + (pattern[3] || '0'));
    }

    // 4. 順列の一部を生成（最大10個まで）
    const digits = [mostFrequentDigits[0] || '0', mostFrequentDigits[1] || '0', 
                   mostFrequentDigits[2] || '0', mostFrequentDigits[3] || '0'];
    
    // 重複を除いた数字の配列
    const uniqueDigits = [...new Set(digits)];
    
    if (uniqueDigits.length >= 4) {
      // 4つ以上異なる数字がある場合は順列を生成
      generatePermutations(uniqueDigits.slice(0, 4), predictions, 10);
    } else {
      // 重複がある場合は、2番目に多い数字を混ぜて予想を生成
      for (let i = 0; i < 4 && predictions.size < 10; i++) {
        const mixed = [...mostFrequentDigits];
        mixed[i] = secondFrequentDigits[i] || '0';
        
        // 位置を入れ替えたパターンも追加
        for (let j = 0; j < 4 && predictions.size < 10; j++) {
          if (i !== j) {
            [mixed[i], mixed[j]] = [mixed[j] || '0', mixed[i] || '0'];
            predictions.add((mixed[0] || '0') + (mixed[1] || '0') + (mixed[2] || '0') + (mixed[3] || '0'));
          }
        }
      }
    }

    return Array.from(predictions).slice(0, 10);
    
  } catch (error) {
    console.error('Kako prediction generation error:', error);
    return [];
  }
}

/**
 * 順列を生成するヘルパー関数
 */
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

/**
 * 各桁の頻度分析結果を取得（デバッグ・表示用）
 */
export async function getKakoAnalysis(): Promise<{
  digitFrequency: Array<Array<{ digit: string; count: number; percentage: number }>>;
  mostFrequent: string[];
  sampleSize: number;
}> {
  const historicalData = await DrawResult.find()
    .sort({ drawDate: -1 })
    .limit(100)
    .select('winningNumber');

  const digitFrequency: Array<Record<string, number>> = [{}, {}, {}, {}];

  historicalData.forEach(result => {
    const number = result.winningNumber.padStart(4, '0');
    
    for (let i = 0; i < 4; i++) {
      const digit = number[3 - i];
      if (digitFrequency[i] && digit) {
        digitFrequency[i]![digit] = (digitFrequency[i]![digit] || 0) + 1;
      }
    }
  });

  // 頻度を配列形式に変換
  const analysis = digitFrequency.map(freq => {
    const total = Object.values(freq).reduce((sum, count) => sum + count, 0);
    return Object.entries(freq)
      .map(([digit, count]) => ({
        digit,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  });

  const mostFrequent = digitFrequency.map(freq => {
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

  return {
    digitFrequency: analysis,
    mostFrequent,
    sampleSize: historicalData.length
  };
}