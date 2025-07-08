import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { Prediction, IPrediction } from '../../src/models/Prediction';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('Prediction Model', () => {
  describe('予想作成', () => {
    it('有効なデータで予想を作成できる', async () => {
      const predictionData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678', '9012', '3456'],
        aiPredictions: ['2345', '6789', '0123', '4567'],
      };

      const prediction = await Prediction.create(predictionData);

      expect(prediction._id).toBeDefined();
      expect(prediction.drawNumber).toBe(1600);
      expect(prediction.dataLogicPredictions).toHaveLength(4);
      expect(prediction.aiPredictions).toHaveLength(4);
      expect(prediction.viewCount).toBe(0);
      expect(prediction.generatedAt).toBeDefined();
    });

    it('同じ抽選回の予想は作成できない', async () => {
      const predictionData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['2345'],
      };

      await Prediction.create(predictionData);

      await expect(Prediction.create(predictionData)).rejects.toThrow();
    });

    it('4桁以外の予想番号は拒否される', async () => {
      const predictionData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['123'], // 3桁
        aiPredictions: ['2345'],
      };

      await expect(Prediction.create(predictionData)).rejects.toThrow();
    });

    it('最大10個を超える予想は拒否される', async () => {
      const predictionData = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: Array(11).fill('1234'), // 11個
        aiPredictions: ['2345'],
      };

      await expect(Prediction.create(predictionData)).rejects.toThrow();
    });

    it('生成日時が自動設定される', async () => {
      const before = new Date();
      
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['2345'],
      });

      const after = new Date();

      expect(prediction.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(prediction.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('予想検索', () => {
    beforeEach(async () => {
      await Prediction.create([
        {
          drawNumber: 1598,
          drawDate: new Date('2024-01-08'),
          dataLogicPredictions: ['1111'],
          aiPredictions: ['2222'],
          viewCount: 100,
        },
        {
          drawNumber: 1599,
          drawDate: new Date('2024-01-11'),
          dataLogicPredictions: ['3333'],
          aiPredictions: ['4444'],
          viewCount: 50,
        },
        {
          drawNumber: 1600,
          drawDate: new Date('2024-01-15'),
          dataLogicPredictions: ['5555'],
          aiPredictions: ['6666'],
          viewCount: 0,
        },
      ]);
    });

    it('抽選回番号で予想を検索できる', async () => {
      const prediction = await Prediction.findByDrawNumber(1599);
      expect(prediction).toBeDefined();
      expect(prediction?.drawNumber).toBe(1599);
    });

    it('最新の予想を取得できる', async () => {
      const latest = await Prediction.findLatest();
      expect(latest).toBeDefined();
      expect(latest?.drawNumber).toBe(1600);
    });

    it('公開された予想のみ取得できる', async () => {
      const published = await Prediction.findPublished();
      expect(published).toHaveLength(2); // viewCount > 0 のもの
      expect(published[0].drawNumber).toBe(1599); // 新しい順
      expect(published[1].drawNumber).toBe(1598);
    });

    it('日付範囲で予想を検索できる', async () => {
      const start = new Date('2024-01-10');
      const end = new Date('2024-01-14');
      
      const predictions = await Prediction.find({
        drawDate: { $gte: start, $lte: end }
      });
      
      expect(predictions).toHaveLength(1);
      expect(predictions[0].drawNumber).toBe(1599);
    });
  });

  describe('閲覧数管理', () => {
    it('閲覧数をインクリメントできる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['2345'],
      });

      expect(prediction.viewCount).toBe(0);

      await prediction.incrementViewCount();
      expect(prediction.viewCount).toBe(1);

      await prediction.incrementViewCount();
      expect(prediction.viewCount).toBe(2);
    });
  });

  describe('データ検証', () => {
    it('予想番号の重複をチェックできる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678', '1234'], // 重複あり
        aiPredictions: ['2345'],
      });

      const hasDuplicates = prediction.hasDuplicatePredictions();
      expect(hasDuplicates).toBe(true);
    });

    it('ユニークな予想番号の数を取得できる', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['1234', '5678', '1234'],
        aiPredictions: ['2345', '5678'], // dataLogicと重複
      });

      const uniqueCount = prediction.getUniquePredictionsCount();
      expect(uniqueCount).toBe(3); // 1234, 5678, 2345
    });
  });
});