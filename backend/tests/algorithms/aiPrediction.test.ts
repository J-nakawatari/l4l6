import { AIPredictionAlgorithm } from '../../src/algorithms/aiPrediction';
import { DrawResult } from '../../src/models/DrawResult';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';

// 外部AI APIのモック
jest.mock('../../src/services/ai.service');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('AIPredictionAlgorithm', () => {
  let algorithm: AIPredictionAlgorithm;

  beforeEach(async () => {
    algorithm = new AIPredictionAlgorithm();
    
    // テスト用の履歴データを準備
    const historicalData = [
      { drawNumber: 1590, numbers: [3, 7, 15, 22, 31, 40] },
      { drawNumber: 1591, numbers: [5, 12, 18, 25, 33, 41] },
      { drawNumber: 1592, numbers: [1, 9, 16, 28, 35, 42] },
      { drawNumber: 1593, numbers: [2, 11, 20, 30, 37, 43] },
      { drawNumber: 1594, numbers: [4, 14, 23, 32, 38, 39] },
      { drawNumber: 1595, numbers: [6, 10, 19, 27, 34, 36] },
      { drawNumber: 1596, numbers: [8, 13, 21, 24, 29, 40] },
      { drawNumber: 1597, numbers: [1, 15, 17, 26, 33, 41] },
      { drawNumber: 1598, numbers: [3, 12, 22, 31, 35, 43] },
      { drawNumber: 1599, numbers: [5, 11, 18, 28, 37, 42] },
    ];

    for (const data of historicalData) {
      await DrawResult.create({
        drawNumber: data.drawNumber,
        drawDate: new Date(2024, 0, data.drawNumber - 1589),
        winningNumbers: data.numbers,
        winningNumber: data.numbers.slice(0, 2).map(n => n.toString().padStart(2, '0')).join(''),
        prize: { amount: 100000000, winners: 1 },
      });
    }
  });

  describe('パターン認識', () => {
    it('過去の当選パターンを分析する', async () => {
      const patterns = await algorithm.analyzePatterns();
      
      expect(patterns).toHaveProperty('consecutivePatterns');
      expect(patterns).toHaveProperty('gapPatterns');
      expect(patterns).toHaveProperty('sumPatterns');
      expect(patterns).toHaveProperty('oddEvenPatterns');
    });

    it('連番パターンを検出する', async () => {
      const patterns = await algorithm.analyzeConsecutivePatterns();
      
      expect(patterns).toBeInstanceOf(Array);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('count');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern.count).toBeGreaterThanOrEqual(0);
        expect(pattern.count).toBeLessThanOrEqual(5);
      });
    });

    it('数字間隔パターンを検出する', async () => {
      const patterns = await algorithm.analyzeGapPatterns();
      
      expect(patterns).toHaveProperty('averageGap');
      expect(patterns).toHaveProperty('mostCommonGaps');
      expect(patterns.averageGap).toBeGreaterThan(0);
      expect(patterns.mostCommonGaps).toBeInstanceOf(Array);
    });
  });

  describe('機械学習ベースの予測', () => {
    it('特徴量を抽出する', async () => {
      const features = await algorithm.extractFeatures([1, 10, 20, 30, 35, 43]);
      
      expect(features).toHaveProperty('sum');
      expect(features).toHaveProperty('average');
      expect(features).toHaveProperty('spread');
      expect(features).toHaveProperty('oddCount');
      expect(features).toHaveProperty('evenCount');
      expect(features).toHaveProperty('consecutiveCount');
      expect(features).toHaveProperty('lowCount'); // 1-22
      expect(features).toHaveProperty('highCount'); // 23-43
      expect(features).toHaveProperty('gaps');
    });

    it('類似パターンから予測を生成する', async () => {
      const predictions = await algorithm.generateFromSimilarPatterns();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
        expect(prediction.every(n => n >= 1 && n <= 43)).toBe(true);
        expect(new Set(prediction).size).toBe(6);
      });
    });
  });

  describe('時系列分析', () => {
    it('トレンドを分析する', async () => {
      const trends = await algorithm.analyzeTrends();
      
      expect(trends).toHaveProperty('increasingNumbers');
      expect(trends).toHaveProperty('decreasingNumbers');
      expect(trends).toHaveProperty('stableNumbers');
      
      // 各配列が数字の配列であることを確認
      expect(trends.increasingNumbers).toBeInstanceOf(Array);
      expect(trends.decreasingNumbers).toBeInstanceOf(Array);
      expect(trends.stableNumbers).toBeInstanceOf(Array);
    });

    it('周期性を検出する', async () => {
      const cycles = await algorithm.detectCycles();
      
      expect(cycles).toBeInstanceOf(Array);
      cycles.forEach(cycle => {
        expect(cycle).toHaveProperty('number');
        expect(cycle).toHaveProperty('period');
        expect(cycle).toHaveProperty('confidence');
        expect(cycle.number).toBeGreaterThanOrEqual(1);
        expect(cycle.number).toBeLessThanOrEqual(43);
      });
    });
  });

  describe('クラスタリング分析', () => {
    it('数字をグループ化する', async () => {
      const clusters = await algorithm.clusterNumbers();
      
      expect(clusters).toBeInstanceOf(Array);
      expect(clusters.length).toBeGreaterThan(0);
      
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('numbers');
        expect(cluster).toHaveProperty('frequency');
        expect(cluster.numbers).toBeInstanceOf(Array);
        expect(cluster.numbers.every(n => n >= 1 && n <= 43)).toBe(true);
      });
    });

    it('グループから予測を生成する', async () => {
      const predictions = await algorithm.generateFromClusters();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
        // 異なるクラスターから選ばれていることを期待
        expect(new Set(prediction).size).toBe(6);
      });
    });
  });

  describe('ニューラルネットワーク風の予測', () => {
    it('重み付けされた予測を生成する', async () => {
      const predictions = await algorithm.generateWithNeuralApproach();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
        expect(prediction.every(n => n >= 1 && n <= 43)).toBe(true);
      });
    });

    it('各数字に信頼度スコアを付与する', async () => {
      const scoredPredictions = await algorithm.generateWithConfidenceScores();
      
      expect(scoredPredictions).toHaveLength(4);
      scoredPredictions.forEach(prediction => {
        expect(prediction).toHaveProperty('numbers');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction.numbers).toHaveLength(6);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('統合AI予測', () => {
    it('複数のAI手法を組み合わせた予測を生成する', async () => {
      const predictions = await algorithm.generateIntegratedAIPredictions();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
        expect(prediction.every(n => n >= 1 && n <= 43)).toBe(true);
        expect(new Set(prediction).size).toBe(6);
        expect(prediction).toEqual([...prediction].sort((a, b) => a - b));
      });
    });

    it('4桁形式の文字列配列として出力する', async () => {
      const predictions = await algorithm.generatePredictionsForSaving();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('string');
        expect(prediction).toMatch(/^\d{4}$/);
      });
    });
  });

  describe('異常値処理', () => {
    it('異常なパターンを除外する', async () => {
      // 異常なデータを追加
      await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date(),
        winningNumbers: [1, 2, 3, 4, 5, 6], // 明らかに異常（連続6つ）
        winningNumber: '0102',
        prize: { amount: 100000000, winners: 0 }, // 当選者なし
      });

      const predictions = await algorithm.generateIntegratedAIPredictions();
      
      // 異常パターンを避けることを確認
      predictions.forEach(prediction => {
        // 6連続の数字にならないことを確認
        let consecutiveCount = 0;
        for (let i = 0; i < prediction.length - 1; i++) {
          if (prediction[i + 1] - prediction[i] === 1) {
            consecutiveCount++;
          }
        }
        expect(consecutiveCount).toBeLessThan(5);
      });
    });
  });

  describe('外部AI API連携', () => {
    it('外部APIからの予測を統合する', async () => {
      // AIサービスのモック設定
      const mockAIService = require('../../src/services/ai.service');
      mockAIService.generatePredictions.mockResolvedValue([
        [7, 14, 21, 28, 35, 42],
        [1, 11, 21, 31, 41, 43],
      ]);

      const predictions = await algorithm.integrateExternalAIPredictions();
      
      expect(predictions).toHaveLength(4);
      // 外部APIの予測が含まれていることを確認
      expect(mockAIService.generatePredictions).toHaveBeenCalled();
    });

    it('外部APIがエラーの場合でも予測を生成する', async () => {
      const mockAIService = require('../../src/services/ai.service');
      mockAIService.generatePredictions.mockRejectedValue(new Error('API Error'));

      const predictions = await algorithm.integrateExternalAIPredictions();
      
      // フォールバックして内部アルゴリズムで生成
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
      });
    });
  });
});