import { DataLogicAlgorithm } from '../../src/algorithms/dataLogic';
import { DrawResult } from '../../src/models/DrawResult';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('DataLogicAlgorithm', () => {
  let algorithm: DataLogicAlgorithm;

  beforeEach(() => {
    algorithm = new DataLogicAlgorithm();
  });

  describe('基本的な数字生成', () => {
    it('1から43までの数字を6つ生成する', () => {
      const numbers = algorithm.generateNumbers();
      
      expect(numbers).toHaveLength(6);
      expect(numbers.every(n => n >= 1 && n <= 43)).toBe(true);
      // 重複がないことを確認
      expect(new Set(numbers).size).toBe(6);
      // ソートされていることを確認
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    });

    it('複数回生成しても異なる組み合わせを生成する', () => {
      const results = new Set<string>();
      
      // 10回生成
      for (let i = 0; i < 10; i++) {
        const numbers = algorithm.generateNumbers();
        results.add(numbers.join(','));
      }
      
      // 少なくとも5種類以上の異なる組み合わせが生成されることを期待
      expect(results.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('頻度分析に基づく予想', () => {
    beforeEach(async () => {
      // テスト用の過去の抽選結果を作成
      const testResults = [
        { drawNumber: 1, winningNumbers: [1, 2, 3, 4, 5, 6] },
        { drawNumber: 2, winningNumbers: [1, 7, 8, 9, 10, 11] },
        { drawNumber: 3, winningNumbers: [1, 2, 12, 13, 14, 15] },
        { drawNumber: 4, winningNumbers: [1, 16, 17, 18, 19, 20] },
        { drawNumber: 5, winningNumbers: [2, 21, 22, 23, 24, 25] },
      ];

      for (const result of testResults) {
        await DrawResult.create({
          drawNumber: result.drawNumber,
          drawDate: new Date(2024, 0, result.drawNumber),
          winningNumbers: result.winningNumbers,
          winningNumber: result.winningNumbers.join(''), // 4桁形式用
          prize: { amount: 100000000, winners: 1 },
        });
      }
    });

    it('頻出数字を含む予想を生成する', async () => {
      const predictions = await algorithm.generateWithFrequencyAnalysis();
      
      expect(predictions).toHaveLength(4); // 4つの予想を生成
      
      // 各予想が6つの数字を持つことを確認
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
        expect(prediction.every(n => n >= 1 && n <= 43)).toBe(true);
        expect(new Set(prediction).size).toBe(6);
      });
    });

    it('最も頻出する数字を優先的に選択する', async () => {
      const predictions = await algorithm.generateWithFrequencyAnalysis();
      
      // 数字1と2が最も頻出（上記のテストデータでは）
      // 少なくとも1つの予想にこれらの数字が含まれることを期待
      const allNumbers = predictions.flat();
      expect(allNumbers.includes(1) || allNumbers.includes(2)).toBe(true);
    });
  });

  describe('連番・飛び番分析', () => {
    it('連番を適度に含む予想を生成する', () => {
      const predictions = algorithm.generateWithConsecutiveAnalysis();
      
      predictions.forEach(prediction => {
        // 連番（隣接する数字）の数をカウント
        let consecutiveCount = 0;
        for (let i = 0; i < prediction.length - 1; i++) {
          if (prediction[i + 1] - prediction[i] === 1) {
            consecutiveCount++;
          }
        }
        
        // 連番が0〜3個の範囲であることを期待（適度な連番）
        expect(consecutiveCount).toBeGreaterThanOrEqual(0);
        expect(consecutiveCount).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('奇数偶数バランス', () => {
    it('奇数と偶数のバランスが取れた予想を生成する', () => {
      const predictions = algorithm.generateWithOddEvenBalance();
      
      predictions.forEach(prediction => {
        const oddCount = prediction.filter(n => n % 2 === 1).length;
        const evenCount = prediction.filter(n => n % 2 === 0).length;
        
        // 奇数と偶数の数が2:4、3:3、4:2のいずれかであることを期待
        expect([2, 3, 4]).toContain(oddCount);
        expect([2, 3, 4]).toContain(evenCount);
        expect(oddCount + evenCount).toBe(6);
      });
    });
  });

  describe('合計値分析', () => {
    it('適切な合計値範囲の予想を生成する', () => {
      const predictions = algorithm.generateWithSumAnalysis();
      
      predictions.forEach(prediction => {
        const sum = prediction.reduce((a, b) => a + b, 0);
        
        // ナンバーズ4の理論的な合計値の計算ロジック
        // 通常は100〜170の範囲に収まることが多い
        expect(sum).toBeGreaterThanOrEqual(80);
        expect(sum).toBeLessThanOrEqual(190);
      });
    });
  });

  describe('前回との関連性分析', () => {
    it('前回の当選番号との関連性を考慮した予想を生成する', async () => {
      // 最新の抽選結果を作成
      await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date(),
        winningNumbers: [5, 10, 15, 20, 25, 30],
        winningNumber: '0510',
        prize: { amount: 100000000, winners: 1 },
      });

      const predictions = await algorithm.generateWithPreviousRelation();
      
      predictions.forEach(prediction => {
        // 前回の当選番号と完全に一致しないことを確認
        expect(prediction).not.toEqual([5, 10, 15, 20, 25, 30]);
        
        // 前回の当選番号から0〜2個程度を含むことを期待
        const overlap = prediction.filter(n => [5, 10, 15, 20, 25, 30].includes(n)).length;
        expect(overlap).toBeGreaterThanOrEqual(0);
        expect(overlap).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('統合アルゴリズム', () => {
    it('複数の分析手法を組み合わせた予想を生成する', async () => {
      const predictions = await algorithm.generateIntegratedPredictions();
      
      expect(predictions).toHaveLength(4);
      
      // 各予想が有効であることを確認
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
      
      // 各予想が4桁の文字列であることを確認
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('string');
        expect(prediction).toMatch(/^\d{4}$/);
      });
    });
  });

  describe('過去データが少ない場合の処理', () => {
    it('過去データがない場合でも予想を生成できる', async () => {
      const predictions = await algorithm.generateIntegratedPredictions();
      
      expect(predictions).toHaveLength(4);
      predictions.forEach(prediction => {
        expect(prediction).toHaveLength(6);
      });
    });
  });

  describe('ホットナンバー・コールドナンバー分析', () => {
    beforeEach(async () => {
      // 直近10回の抽選結果を作成（ホットナンバーを特定しやすくする）
      for (let i = 1; i <= 10; i++) {
        const numbers = i <= 5 
          ? [1, 2, 3, 10, 20, 30] // 1,2,3が頻出
          : [4, 5, 6, 15, 25, 35]; // 4,5,6も頻出
        
        await DrawResult.create({
          drawNumber: 1600 + i,
          drawDate: new Date(2024, 0, i),
          winningNumbers: numbers,
          winningNumber: '0102',
          prize: { amount: 100000000, winners: 1 },
        });
      }
    });

    it('ホットナンバーを識別する', async () => {
      const hotNumbers = await algorithm.getHotNumbers(10);
      
      expect(hotNumbers).toContain(1);
      expect(hotNumbers).toContain(2);
      expect(hotNumbers).toContain(3);
      expect(hotNumbers.length).toBeLessThanOrEqual(10);
    });

    it('コールドナンバーを識別する', async () => {
      const coldNumbers = await algorithm.getColdNumbers(10);
      
      // 7以降の数字は出現していないはず
      expect(coldNumbers.some(n => n >= 7 && n <= 43)).toBe(true);
      expect(coldNumbers.length).toBeGreaterThan(0);
    });

    it('ホット・コールドナンバーを組み合わせた予想を生成する', async () => {
      const predictions = await algorithm.generateWithHotColdAnalysis();
      
      predictions.forEach(prediction => {
        // 各予想にホットナンバーとコールドナンバーが
        // バランスよく含まれることを期待
        const hotNumbers = await algorithm.getHotNumbers(10);
        const hotCount = prediction.filter(n => hotNumbers.includes(n)).length;
        
        // ホットナンバーが1〜3個含まれることを期待
        expect(hotCount).toBeGreaterThanOrEqual(1);
        expect(hotCount).toBeLessThanOrEqual(3);
      });
    });
  });
});