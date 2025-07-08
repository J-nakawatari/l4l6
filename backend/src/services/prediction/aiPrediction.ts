import { IDrawResult } from '../../models/DrawResult';

export interface AIPrediction {
  predict(drawResults: IDrawResult[]): Promise<string[]>;
}

interface PredictionFeatures {
  digitFrequency: Record<string, number>[];
  patterns: {
    consecutive: number;
    oddEven: number;
    sumRange: { min: number; max: number };
  };
  timeSeries: number[][];
}

export class NeuralNetworkPrediction implements AIPrediction {
  /**
   * AIを使用して予想を生成
   * @param drawResults 過去の抽選結果
   * @returns 予想番号の配列（10個）
   */
  async predict(drawResults: IDrawResult[]): Promise<string[]> {
    if (drawResults.length === 0) {
      throw new Error('Insufficient data for AI prediction');
    }

    // 1. データの前処理
    const features = this.preprocessData(drawResults);
    
    // 2. 予測モデルによる生成（実際にはニューラルネットワークを使用）
    const predictions = this.generatePredictions(features);
    
    // 3. 予測結果をフォーマット
    return this.formatPredictions(predictions);
  }

  /**
   * 過去のデータを特徴量に変換
   * @private
   */
  private preprocessData(drawResults: IDrawResult[]): PredictionFeatures {
    // 桁ごとの頻度計算
    const digitFrequency = this.calculateDigitFrequency(drawResults);
    
    // パターン分析
    const patterns = this.analyzePatterns(drawResults);
    
    // 時系列データの準備
    const timeSeries = this.prepareTimeSeries(drawResults);

    return {
      digitFrequency,
      patterns,
      timeSeries
    };
  }

  /**
   * 各桁の数字の出現頻度を計算
   * @private
   */
  private calculateDigitFrequency(drawResults: IDrawResult[]): Record<string, number>[] {
    const frequency: Record<string, number>[] = [{}, {}, {}, {}];

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
   * パターンを分析
   * @private
   */
  private analyzePatterns(drawResults: IDrawResult[]): PredictionFeatures['patterns'] {
    let consecutiveCount = 0;
    let oddEvenBalance = 0;
    let sumMin = Infinity;
    let sumMax = -Infinity;

    drawResults.forEach(result => {
      const digits = result.winningNumber.split('').map(Number);
      
      // 連続数字のチェック
      for (let i = 0; i < digits.length - 1; i++) {
        if (Math.abs(digits[i]! - digits[i + 1]!) === 1) {
          consecutiveCount++;
        }
      }
      
      // 奇数偶数のバランス
      const oddCount = digits.filter(d => d % 2 === 1).length;
      oddEvenBalance += oddCount / 4;
      
      // 合計値の範囲
      const sum = digits.reduce((a, b) => a + b, 0);
      sumMin = Math.min(sumMin, sum);
      sumMax = Math.max(sumMax, sum);
    });

    return {
      consecutive: consecutiveCount / (drawResults.length * 3), // 正規化
      oddEven: oddEvenBalance / drawResults.length,
      sumRange: { min: sumMin, max: sumMax }
    };
  }

  /**
   * 時系列データの準備
   * @private
   */
  private prepareTimeSeries(drawResults: IDrawResult[]): number[][] {
    // 最新の10件を時系列データとして使用
    const recent = drawResults.slice(-10);
    return recent.map(result => 
      result.winningNumber.split('').map(Number)
    );
  }

  /**
   * 特徴量から予想を生成
   * @private
   */
  private generatePredictions(features: PredictionFeatures): number[][] {
    const predictions: number[][] = [];
    const usedCombinations = new Set<string>();

    // 頻度ベースの予想
    for (let i = 0; i < 5; i++) {
      const prediction = this.generateFrequencyBased(features.digitFrequency, usedCombinations);
      if (prediction) {
        predictions.push(prediction);
        usedCombinations.add(prediction.join(''));
      }
    }

    // パターンベースの予想
    for (let i = 0; i < 3; i++) {
      const prediction = this.generatePatternBased(features, usedCombinations);
      if (prediction) {
        predictions.push(prediction);
        usedCombinations.add(prediction.join(''));
      }
    }

    // ランダム要素を加えた予想
    while (predictions.length < 10) {
      const prediction = this.generateRandomVariation(features, usedCombinations);
      if (prediction) {
        predictions.push(prediction);
        usedCombinations.add(prediction.join(''));
      }
    }

    return predictions;
  }

  /**
   * 頻度ベースの予想生成
   * @private
   */
  private generateFrequencyBased(
    digitFrequency: Record<string, number>[], 
    used: Set<string>
  ): number[] | null {
    const prediction: number[] = [];
    
    for (let position = 0; position < 4; position++) {
      const weights = digitFrequency[position]!;
      const digit = this.weightedRandom(weights);
      prediction.push(parseInt(digit));
    }

    const key = prediction.join('');
    if (used.has(key)) {
      return null;
    }

    return prediction;
  }

  /**
   * パターンベースの予想生成
   * @private
   */
  private generatePatternBased(
    features: PredictionFeatures,
    used: Set<string>
  ): number[] | null {
    const prediction: number[] = [];
    
    // 連続パターンを考慮
    if (Math.random() < features.patterns.consecutive) {
      // 連続する数字を生成
      const start = Math.floor(Math.random() * 7); // 0-6
      for (let i = 0; i < 4; i++) {
        prediction.push((start + i) % 10);
      }
    } else {
      // 頻度ベースで生成
      for (let position = 0; position < 4; position++) {
        const weights = features.digitFrequency[position]!;
        const digit = this.weightedRandom(weights);
        prediction.push(parseInt(digit));
      }
    }

    const key = prediction.join('');
    if (used.has(key)) {
      return null;
    }

    return prediction;
  }

  /**
   * ランダム変異を加えた予想生成
   * @private
   */
  private generateRandomVariation(
    features: PredictionFeatures,
    used: Set<string>
  ): number[] | null {
    const prediction: number[] = [];
    
    for (let position = 0; position < 4; position++) {
      if (Math.random() < 0.7) {
        // 70%の確率で頻度ベース
        const weights = features.digitFrequency[position]!;
        const digit = this.weightedRandom(weights);
        prediction.push(parseInt(digit));
      } else {
        // 30%の確率でランダム
        prediction.push(Math.floor(Math.random() * 10));
      }
    }

    const key = prediction.join('');
    if (used.has(key)) {
      return null;
    }

    return prediction;
  }

  /**
   * 重み付きランダム選択
   * @private
   */
  private weightedRandom(weights: Record<string, number>): string {
    const entries = Object.entries(weights);
    if (entries.length === 0) {
      return Math.floor(Math.random() * 10).toString();
    }

    const totalWeight = entries.reduce((sum, [_, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [digit, weight] of entries) {
      random -= weight;
      if (random <= 0) {
        return digit;
      }
    }

    return entries[0]![0];
  }

  /**
   * 予想を正しい形式に変換
   * @private
   */
  private formatPredictions(predictions: number[][]): string[] {
    return predictions.map(pred => 
      pred.map(d => d.toString()).join('')
    );
  }
}