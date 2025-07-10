import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { DrawResult } from '../../src/models/DrawResult';
import { Prediction } from '../../src/models/Prediction';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('DrawResult Model', () => {
  describe('抽選結果作成', () => {
    it('有効なデータで抽選結果を作成できる', async () => {
      const drawData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: {
          amount: 100000000,
          winners: 3,
        },
      };

      const result = await DrawResult.create(drawData);

      expect(result._id).toBeDefined();
      expect(result.drawNumber).toBe(1600);
      expect(result.winningNumber).toBe('1234');
      expect(result.prize.amount).toBe(100000000);
      expect(result.prize.winners).toBe(3);
      expect(result.fetchedAt).toBeDefined();
    });

    it('同じ抽選回の結果は作成できない', async () => {
      const drawData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: {
          amount: 100000000,
          winners: 3,
        },
      };

      await DrawResult.create(drawData);

      await expect(DrawResult.create(drawData)).rejects.toThrow();
    });

    it('4桁以外の当選番号は拒否される', async () => {
      const drawData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '123', // 3桁
        prize: {
          amount: 100000000,
          winners: 3,
        },
      };

      await expect(DrawResult.create(drawData)).rejects.toThrow();
    });

    it('負の賞金額は拒否される', async () => {
      const drawData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: {
          amount: -1000,
          winners: 3,
        },
      };

      await expect(DrawResult.create(drawData)).rejects.toThrow();
    });
  });

  describe('抽選結果検索', () => {
    beforeEach(async () => {
      await DrawResult.create([
        {
          drawNumber: 1598,
          drawDate: new Date('2024-01-08'),
          winningNumber: '1111',
          prize: { amount: 50000000, winners: 5 },
        },
        {
          drawNumber: 1599,
          drawDate: new Date('2024-01-11'),
          winningNumber: '2222',
          prize: { amount: 100000000, winners: 2 },
        },
        {
          drawNumber: 1600,
          drawDate: new Date('2024-01-15'),
          winningNumber: '3333',
          prize: { amount: 200000000, winners: 1 },
        },
      ]);
    });

    it('抽選回番号で結果を検索できる', async () => {
      const result = await DrawResult.findByDrawNumber(1599);
      expect(result).toBeDefined();
      expect(result?.winningNumber).toBe('2222');
    });

    it('最新の結果を取得できる', async () => {
      const latest = await DrawResult.findLatest();
      expect(latest).toBeDefined();
      expect(latest?.drawNumber).toBe(1600);
    });

    it('期間で結果を検索できる', async () => {
      const results = await DrawResult.findByDateRange(
        new Date('2024-01-10'),
        new Date('2024-01-16')
      );
      
      expect(results).toHaveLength(2);
      expect(results[0]?.drawNumber).toBe(1600); // 新しい順
      expect(results[1]?.drawNumber).toBe(1599);
    });

    it('過去N回の結果を取得できる', async () => {
      const results = await DrawResult.findRecent(2);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.drawNumber).toBe(1600);
      expect(results[1]?.drawNumber).toBe(1599);
    });
  });

  describe('予想との照合', () => {
    it('予想が当選したかチェックできる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678'],
        aiPredictions: ['1234', '9012'],
      });

      const result = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: { amount: 100000000, winners: 3 },
      });

      const hits = await result.checkPredictionHits(prediction);
      
      expect(hits.dataLogicHits).toEqual(['1234']);
      expect(hits.aiHits).toEqual(['1234']);
      expect(hits.totalHits).toBe(2);
    });

    it('当選しなかった場合は空配列を返す', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['5678', '9012'],
        aiPredictions: ['3456', '7890'],
      });

      const result = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumber: '1234',
        prize: { amount: 100000000, winners: 3 },
      });

      const hits = await result.checkPredictionHits(prediction);
      
      expect(hits.dataLogicHits).toEqual([]);
      expect(hits.aiHits).toEqual([]);
      expect(hits.totalHits).toBe(0);
    });
  });

  describe('統計情報', () => {
    beforeEach(async () => {
      await DrawResult.create([
        {
          drawNumber: 1598,
          drawDate: new Date('2024-01-08'),
          winningNumber: '1234',
          prize: { amount: 50000000, winners: 5 },
        },
        {
          drawNumber: 1599,
          drawDate: new Date('2024-01-11'),
          winningNumber: '1254',
          prize: { amount: 100000000, winners: 2 },
        },
        {
          drawNumber: 1600,
          drawDate: new Date('2024-01-15'),
          winningNumber: '1294',
          prize: { amount: 200000000, winners: 1 },
        },
      ]);
    });

    it('数字の出現頻度を計算できる', async () => {
      const frequency = await DrawResult.calculateDigitFrequency(3);
      
      // 1の位: 4が3回
      expect(frequency[0]?.['4']).toBe(3);
      
      // 10の位: 3,5,9が各1回
      expect(frequency[1]?.['3']).toBe(1);
      expect(frequency[1]?.['5']).toBe(1);
      expect(frequency[1]?.['9']).toBe(1);
      
      // 100の位: 2が3回
      expect(frequency[2]?.['2']).toBe(3);
      
      // 1000の位: 1が3回
      expect(frequency[3]?.['1']).toBe(3);
    });
  });
});