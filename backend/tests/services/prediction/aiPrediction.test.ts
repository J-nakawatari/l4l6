import { NeuralNetworkPrediction } from '../../../src/services/prediction/aiPrediction';

describe('NeuralNetworkPrediction', () => {
  let predictor: NeuralNetworkPrediction;

  beforeEach(() => {
    predictor = new NeuralNetworkPrediction();
  });

  describe('predict', () => {
    it('過去のデータから10個の予想を生成する', async () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date('2024-01-01') },
        { drawNumber: 2, winningNumber: '5678', drawDate: new Date('2024-01-02') },
        { drawNumber: 3, winningNumber: '9012', drawDate: new Date('2024-01-03') },
        { drawNumber: 4, winningNumber: '3456', drawDate: new Date('2024-01-04') },
        { drawNumber: 5, winningNumber: '7890', drawDate: new Date('2024-01-05') },
      ];

      const predictions = await predictor.predict(mockDrawResults);

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(10);
      
      // 各予想が4桁の文字列であることを確認
      predictions.forEach((pred: any) => {
        expect(pred).toMatch(/^\d{4}$/);
      });
    });

    it('入力が少なくても動作する', async () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date() },
      ];

      const predictions = await predictor.predict(mockDrawResults);

      expect(predictions).toBeDefined();
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(10);
    });

    it('空の入力に対してエラーをスローする', async () => {
      await expect(predictor.predict([])).rejects.toThrow('Insufficient data for AI prediction');
    });

    it('生成された予想が重複しない', async () => {
      const mockDrawResults: any[] = Array(50).fill(null).map((_, i) => ({
        drawNumber: i + 1,
        winningNumber: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        drawDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      }));

      const predictions = await predictor.predict(mockDrawResults);
      const uniquePredictions = new Set(predictions);

      expect(uniquePredictions.size).toBe(predictions.length);
    });
  });

  describe('preprocessData', () => {
    it('過去のデータを特徴量に変換する', () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date('2024-01-01') },
        { drawNumber: 2, winningNumber: '5678', drawDate: new Date('2024-01-02') },
      ];

      const features = predictor['preprocessData'](mockDrawResults);

      expect(features).toBeDefined();
      expect(features.digitFrequency).toBeDefined();
      expect(features.patterns).toBeDefined();
      expect(features.timeSeries).toBeDefined();
    });

    it('桁ごとの頻度を正しく計算する', () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1111', drawDate: new Date() },
        { drawNumber: 2, winningNumber: '2222', drawDate: new Date() },
        { drawNumber: 3, winningNumber: '1111', drawDate: new Date() },
      ];

      const features = predictor['preprocessData'](mockDrawResults);

      // 1が多く出現していることを確認
      expect(features.digitFrequency[0]?.['1'] || 0).toBeGreaterThan(features.digitFrequency[0]?.['2'] || 0);
    });

    it('連続パターンを検出する', () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date() }, // 連続
        { drawNumber: 2, winningNumber: '5678', drawDate: new Date() }, // 連続
        { drawNumber: 3, winningNumber: '1357', drawDate: new Date() }, // 非連続
      ];

      const features = predictor['preprocessData'](mockDrawResults);

      expect(features.patterns.consecutive).toBeGreaterThan(0);
    });
  });

  describe('generatePredictions', () => {
    it('特徴量から予想を生成する', () => {
      const features = {
        digitFrequency: [
          { '1': 5, '2': 3, '0': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
          { '3': 4, '4': 2, '0': 0, '1': 0, '2': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
          { '5': 6, '6': 1, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '7': 0, '8': 0, '9': 0 },
          { '7': 3, '8': 3, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '9': 0 }
        ],
        patterns: {
          consecutive: 0.3,
          oddEven: 0.5,
          sumRange: { min: 10, max: 30 }
        },
        timeSeries: []
      };

      const predictions = predictor['generatePredictions'](features);

      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(10);
      predictions.forEach((pred: any) => {
        expect(pred).toHaveLength(4);
        expect(pred.every((d: any) => typeof d === 'number' && d >= 0 && d <= 9)).toBe(true);
      });
    });

    it('パターンを考慮した予想を生成する', () => {
      const features = {
        digitFrequency: [
          { '1': 10, '0': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
          { '2': 10, '0': 0, '1': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
          { '3': 10, '0': 0, '1': 0, '2': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
          { '4': 10, '0': 0, '1': 0, '2': 0, '3': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 }
        ],
        patterns: {
          consecutive: 1.0, // 常に連続
          oddEven: 0.5,
          sumRange: { min: 10, max: 10 }
        },
        timeSeries: []
      };

      const predictions = predictor['generatePredictions'](features);

      // 1234が含まれているはず
      const hasExpected = predictions.some((pred: number[]) => 
        pred[0] === 1 && pred[1] === 2 && pred[2] === 3 && pred[3] === 4
      );
      expect(hasExpected).toBe(true);
    });

    it('重み付けされた予想を生成する', () => {
      const features = {
        digitFrequency: [
          { '9': 100, '1': 1, '0': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0 },
          { '8': 100, '2': 1, '0': 0, '1': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '9': 0 },
          { '7': 100, '3': 1, '0': 0, '1': 0, '2': 0, '4': 0, '5': 0, '6': 0, '8': 0, '9': 0 },
          { '6': 100, '4': 1, '0': 0, '1': 0, '2': 0, '3': 0, '5': 0, '7': 0, '8': 0, '9': 0 }
        ],
        patterns: {
          consecutive: 0,
          oddEven: 0.5,
          sumRange: { min: 20, max: 40 }
        },
        timeSeries: []
      };

      const predictions = predictor['generatePredictions'](features);

      // 9876が最初の方に含まれているはず
      const highFreqPrediction = predictions.find((p: number[]) => p.includes(9) && p.includes(8));
      expect(highFreqPrediction).toBeDefined();
    });
  });

  describe('formatPredictions', () => {
    it('予想を正しい形式に変換する', () => {
      const rawPredictions = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 0, 1, 2]
      ];

      const formatted = predictor['formatPredictions'](rawPredictions);

      expect(formatted).toEqual(['1234', '5678', '9012']);
    });

    it('数字を0埋めして4桁にする', () => {
      const rawPredictions = [
        [0, 0, 0, 1],
        [0, 1, 2, 3]
      ];

      const formatted = predictor['formatPredictions'](rawPredictions);

      expect(formatted).toEqual(['0001', '0123']);
    });
  });
});