import { FrequencyBasedPrediction } from '../../../src/services/prediction/dataLogic';

describe('FrequencyBasedPrediction', () => {
  describe('analyze', () => {
    it('過去100回の当選番号から各桁の最頻出数字を抽出できる', () => {
      // テストデータ準備
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date() },
        { drawNumber: 2, winningNumber: '1456', drawDate: new Date() },
        { drawNumber: 3, winningNumber: '1789', drawDate: new Date() },
        { drawNumber: 4, winningNumber: '1234', drawDate: new Date() },
        { drawNumber: 5, winningNumber: '1567', drawDate: new Date() },
      ];

      const predictor = new FrequencyBasedPrediction();
      const predictions = predictor.analyze(mockDrawResults);

      // 予想結果の検証
      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeLessThanOrEqual(10);
      expect(predictions.length).toBeGreaterThan(0);
      
      // 各予想が4桁の文字列であることを確認
      predictions.forEach((pred: string) => {
        expect(pred).toMatch(/^\d{4}$/);
      });
    });

    it('入力が100個未満でも動作する', () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date() },
        { drawNumber: 2, winningNumber: '5678', drawDate: new Date() },
      ];

      const predictor = new FrequencyBasedPrediction();
      const predictions = predictor.analyze(mockDrawResults);

      expect(predictions).toBeDefined();
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('空の入力に対してエラーをスローする', () => {
      const predictor = new FrequencyBasedPrediction();
      
      expect(() => predictor.analyze([])).toThrow('Insufficient data for prediction');
    });

    it('各桁で最頻出の数字を正しく抽出する', () => {
      // 明確なパターンを持つテストデータ
      const mockDrawResults: any[] = [
        // 1000の位は全て7
        // 100の位は全て2
        // 10の位は全て5
        // 1の位は全て9
        { drawNumber: 1, winningNumber: '7259', drawDate: new Date() },
        { drawNumber: 2, winningNumber: '7259', drawDate: new Date() },
        { drawNumber: 3, winningNumber: '7259', drawDate: new Date() },
        { drawNumber: 4, winningNumber: '7259', drawDate: new Date() },
        { drawNumber: 5, winningNumber: '7259', drawDate: new Date() },
      ];

      const predictor = new FrequencyBasedPrediction();
      const predictions = predictor.analyze(mockDrawResults);

      // 最頻出の組み合わせが含まれていることを確認
      expect(predictions).toContain('7259');
    });

    it('重複のない順列を生成する', () => {
      const mockDrawResults: any[] = Array(20).fill(null).map((_, i) => ({
        drawNumber: i + 1,
        winningNumber: ['1234', '2345', '3456', '4567'][i % 4],
        drawDate: new Date()
      }));

      const predictor = new FrequencyBasedPrediction();
      const predictions = predictor.analyze(mockDrawResults);

      // 重複がないことを確認
      const uniquePredictions = new Set(predictions);
      expect(uniquePredictions.size).toBe(predictions.length);
    });

    it('最大10個の予想を返す', () => {
      // 多様なパターンを含むテストデータ
      const mockDrawResults: any[] = Array(100).fill(null).map((_, i) => ({
        drawNumber: i + 1,
        winningNumber: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        drawDate: new Date()
      }));

      const predictor = new FrequencyBasedPrediction();
      const predictions = predictor.analyze(mockDrawResults);

      expect(predictions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateDigitFrequency', () => {
    it('各桁の数字の出現頻度を正しく計算する', () => {
      const mockDrawResults: any[] = [
        { drawNumber: 1, winningNumber: '1234', drawDate: new Date() },
        { drawNumber: 2, winningNumber: '1234', drawDate: new Date() },
        { drawNumber: 3, winningNumber: '5678', drawDate: new Date() },
      ];

      const predictor = new FrequencyBasedPrediction();
      const frequency = predictor['calculateDigitFrequency'](mockDrawResults);

      // 1000の位: 1が2回、5が1回
      expect(frequency[0]!['1']).toBe(2);
      expect(frequency[0]!['5']).toBe(1);
      
      // 100の位: 2が2回、6が1回
      expect(frequency[1]!['2']).toBe(2);
      expect(frequency[1]!['6']).toBe(1);
    });
  });

  describe('extractMostFrequentDigits', () => {
    it('各桁で最も頻出する数字を抽出する', () => {
      const frequency: Record<string, number>[] = [
        { '1': 5, '2': 3, '3': 1 }, // 1000の位
        { '4': 2, '5': 7, '6': 1 }, // 100の位
        { '7': 3, '8': 3, '9': 4 }, // 10の位
        { '0': 6, '1': 2, '2': 1 }, // 1の位
      ];

      const predictor = new FrequencyBasedPrediction();
      const mostFrequent = predictor['extractMostFrequentDigits'](frequency);

      expect(mostFrequent).toEqual(['1', '5', '9', '0']);
    });

    it('同じ頻度の場合、複数の候補を返す', () => {
      const frequency: Record<string, number>[] = [
        { '1': 5, '2': 5 }, // 1000の位（同率）
        { '3': 7 },         // 100の位
        { '4': 6 },         // 10の位  
        { '5': 8 },         // 1の位
      ];

      const predictor = new FrequencyBasedPrediction();
      const mostFrequent = predictor['extractMostFrequentDigits'](frequency);

      // 1000の位は1か2のいずれか
      expect(['1', '2']).toContain(mostFrequent[0]);
      expect(mostFrequent[1]).toBe('3');
      expect(mostFrequent[2]).toBe('4');
      expect(mostFrequent[3]).toBe('5');
    });
  });

  describe('generatePermutations', () => {
    it('4つの数字から順列を生成する', () => {
      const predictor = new FrequencyBasedPrediction();
      const permutations = predictor['generatePermutations'](['1', '2', '3', '4'], 10);

      expect(permutations).toContain('1234');
      expect(permutations.length).toBeLessThanOrEqual(10);
      expect(permutations.length).toBe(10); // 10個まで生成される
      
      // 各順列が正しい数字を含むことを確認
      permutations.forEach((perm: string) => {
        expect(perm).toMatch(/^[1234]{4}$/);
      });
    });

    it('指定された最大数まで順列を生成する', () => {
      const predictor = new FrequencyBasedPrediction();
      const permutations = predictor['generatePermutations'](['1', '2', '3', '4'], 5);

      expect(permutations.length).toBe(5);
    });
  });
});