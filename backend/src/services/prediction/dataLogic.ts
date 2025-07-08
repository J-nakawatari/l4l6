import { IDrawResult } from '../../models/DrawResult';

export interface DataLogicPrediction {
  analyze(drawResults: IDrawResult[]): string[];
}

export class FrequencyBasedPrediction implements DataLogicPrediction {
  /**
   * 過去の当選番号を分析して予想を生成
   * @param drawResults 過去の抽選結果
   * @returns 予想番号の配列（最大10個）
   */
  analyze(drawResults: IDrawResult[]): string[] {
    if (drawResults.length === 0) {
      throw new Error('Insufficient data for prediction');
    }

    // 1. 各桁の出現頻度を計算
    const digitFrequency = this.calculateDigitFrequency(drawResults);
    
    // 2. 各桁で最頻出の数字を抽出
    const mostFrequentDigits = this.extractMostFrequentDigits(digitFrequency);
    
    // 3. 順列を生成（最大10個）
    return this.generatePermutations(mostFrequentDigits, 10);
  }

  /**
   * 各桁の数字の出現頻度を計算
   * @private
   */
  private calculateDigitFrequency(drawResults: IDrawResult[]): Record<string, number>[] {
    // 4桁分の頻度カウンター
    const frequency: Record<string, number>[] = [
      {}, // 1000の位
      {}, // 100の位
      {}, // 10の位
      {}, // 1の位
    ];

    drawResults.forEach(result => {
      const digits = result.winningNumber.split('');
      digits.forEach((digit, position) => {
        if (position < 4) {
          frequency[position]![digit] = (frequency[position]![digit] || 0) + 1;
        }
      });
    });

    return frequency;
  }

  /**
   * 各桁で最も頻出する数字を抽出
   * @private
   */
  private extractMostFrequentDigits(frequency: Record<string, number>[]): string[] {
    return frequency.map(positionFreq => {
      let maxCount = 0;
      let mostFrequent = '0';

      Object.entries(positionFreq).forEach(([digit, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostFrequent = digit;
        }
      });

      return mostFrequent;
    });
  }

  /**
   * 4つの数字から順列を生成
   * @private
   */
  private generatePermutations(digits: string[], maxCount: number): string[] {
    const permutations: string[] = [];
    
    // 再帰的に順列を生成
    const generate = (current: string[], remaining: string[]) => {
      if (current.length === 4) {
        permutations.push(current.join(''));
        return;
      }

      for (let i = 0; i < remaining.length; i++) {
        const digit = remaining[i];
        if (digit !== undefined) {
          const newCurrent = [...current, digit];
          const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
          generate(newCurrent, newRemaining);
        }
        
        // 最大数に達したら終了
        if (permutations.length >= maxCount) {
          return;
        }
      }
    };

    generate([], digits);
    
    // 最大数まで切り詰め
    return permutations.slice(0, maxCount);
  }
}