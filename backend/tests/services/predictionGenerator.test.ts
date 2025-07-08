import { PredictionGeneratorService } from '../../src/services/predictionGenerator.service';
import { Prediction } from '../../src/models/Prediction';
import { DrawResult } from '../../src/models/DrawResult';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';

// アルゴリズムのモック
jest.mock('../../src/algorithms/dataLogic');
jest.mock('../../src/algorithms/aiPrediction');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

describe('PredictionGeneratorService', () => {
  let service: PredictionGeneratorService;

  beforeEach(() => {
    service = new PredictionGeneratorService();
  });

  describe('次回抽選番号の取得', () => {
    it('最新の抽選番号から次回番号を計算する', async () => {
      await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date(),
        winningNumber: '1234',
        prize: { amount: 100000000, winners: 1 },
      });

      const nextNumber = await service.getNextDrawNumber();
      expect(nextNumber).toBe(1601);
    });

    it('抽選結果がない場合はデフォルト値を返す', async () => {
      const nextNumber = await service.getNextDrawNumber();
      expect(nextNumber).toBe(1); // または設定されたデフォルト値
    });
  });

  describe('予想生成', () => {
    beforeEach(() => {
      // モックの設定
      const MockDataLogic = require('../../src/algorithms/dataLogic').DataLogicAlgorithm;
      const MockAIPrediction = require('../../src/algorithms/aiPrediction').AIPredictionAlgorithm;

      MockDataLogic.prototype.generatePredictionsForSaving = jest.fn()
        .mockResolvedValue(['1234', '5678', '9012', '3456']);
      
      MockAIPrediction.prototype.generatePredictionsForSaving = jest.fn()
        .mockResolvedValue(['2345', '6789', '0123', '4567']);
    });

    it('新しい予想を生成して保存する', async () => {
      const result = await service.generateNewPrediction();

      expect(result).toHaveProperty('drawNumber');
      expect(result).toHaveProperty('drawDate');
      expect(result).toHaveProperty('dataLogicPredictions');
      expect(result).toHaveProperty('aiPredictions');
      expect(result.dataLogicPredictions).toHaveLength(4);
      expect(result.aiPredictions).toHaveLength(4);

      // データベースに保存されていることを確認
      const saved = await Prediction.findOne({ drawNumber: result.drawNumber });
      expect(saved).toBeDefined();
      expect(saved!.viewCount).toBe(0); // 初期状態では非公開
    });

    it('次回抽選日を正しく計算する', async () => {
      const result = await service.generateNewPrediction();
      
      const drawDate = new Date(result.drawDate);
      const dayOfWeek = drawDate.getDay();
      
      // 抽選日は月曜日（1）または木曜日（4）
      expect([1, 4]).toContain(dayOfWeek);
    });

    it('重複する抽選番号では生成しない', async () => {
      // 既存の予想を作成
      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date(),
        dataLogicPredictions: ['1111'],
        aiPredictions: ['2222'],
        viewCount: 0,
      });

      // 同じ番号で生成を試みる
      jest.spyOn(service, 'getNextDrawNumber').mockResolvedValue(1600);

      await expect(service.generateNewPrediction()).rejects.toThrow('already exists');
    });
  });

  describe('予想の検証', () => {
    it('有効な予想番号を検証する', () => {
      const valid = service.validatePrediction(['1234', '5678', '9012', '3456']);
      expect(valid).toBe(true);
    });

    it('無効な予想番号を検出する', () => {
      // 5つの予想（4つであるべき）
      expect(service.validatePrediction(['1234', '5678', '9012', '3456', '7890']))
        .toBe(false);

      // 3桁の番号
      expect(service.validatePrediction(['123', '5678', '9012', '3456']))
        .toBe(false);

      // 5桁の番号
      expect(service.validatePrediction(['12345', '5678', '9012', '3456']))
        .toBe(false);

      // 数字以外を含む
      expect(service.validatePrediction(['12AB', '5678', '9012', '3456']))
        .toBe(false);

      // 空配列
      expect(service.validatePrediction([]))
        .toBe(false);
    });
  });

  describe('バッチ生成', () => {
    it('複数の予想を一度に生成する', async () => {
      const results = await service.generateBatchPredictions(3);

      expect(results).toHaveLength(3);
      
      const drawNumbers = results.map(r => r.drawNumber);
      // 連続した抽選番号になっていることを確認
      expect(drawNumbers[1]).toBe(drawNumbers[0] + 1);
      expect(drawNumbers[2]).toBe(drawNumbers[1] + 1);

      // すべて保存されていることを確認
      const savedCount = await Prediction.countDocuments();
      expect(savedCount).toBe(3);
    });

    it('エラーが発生した場合はロールバックする', async () => {
      // 2つ目の生成でエラーを発生させる
      let callCount = 0;
      const MockDataLogic = require('../../src/algorithms/dataLogic').DataLogicAlgorithm;
      MockDataLogic.prototype.generatePredictionsForSaving = jest.fn()
        .mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Generation failed');
          }
          return Promise.resolve(['1234', '5678', '9012', '3456']);
        });

      await expect(service.generateBatchPredictions(3)).rejects.toThrow();

      // データベースに何も保存されていないことを確認
      const savedCount = await Prediction.countDocuments();
      expect(savedCount).toBe(0);
    });
  });

  describe('予想の公開', () => {
    it('指定した予想を公開する', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date(),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 0,
      });

      await service.publishPrediction(1600);

      const updated = await Prediction.findOne({ drawNumber: 1600 });
      expect(updated!.viewCount).toBe(1); // 公開されたことを示す
    });

    it('存在しない予想は公開できない', async () => {
      await expect(service.publishPrediction(9999)).rejects.toThrow('not found');
    });

    it('既に公開済みの予想は変更しない', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date(),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 100,
      });

      await service.publishPrediction(1600);

      const updated = await Prediction.findOne({ drawNumber: 1600 });
      expect(updated!.viewCount).toBe(100); // 変更されない
    });
  });

  describe('スケジュール生成', () => {
    it('次回の生成時刻を計算する', () => {
      const now = new Date('2024-01-15T10:00:00'); // 月曜日
      const next = service.getNextGenerationTime(now);

      // 次回は当日の18:00または次の抽選日の18:00
      expect(next.getHours()).toBe(18);
      expect(next.getMinutes()).toBe(0);
      expect(next.getTime()).toBeGreaterThan(now.getTime());
    });

    it('抽選日当日の19:00以降は次の抽選日を返す', () => {
      const now = new Date('2024-01-15T19:30:00'); // 月曜日 19:30
      const next = service.getNextGenerationTime(now);

      // 次は木曜日の18:00
      expect(next.getDay()).toBe(4); // 木曜日
      expect(next.getHours()).toBe(18);
    });
  });

  describe('統計情報', () => {
    beforeEach(async () => {
      // テストデータの準備
      await Prediction.create({
        drawNumber: 1598,
        drawDate: new Date('2024-01-08'),
        dataLogicPredictions: ['1234', '5678'],
        aiPredictions: ['2345', '6789'],
        viewCount: 150,
      });

      await Prediction.create({
        drawNumber: 1599,
        drawDate: new Date('2024-01-11'),
        dataLogicPredictions: ['1111', '2222'],
        aiPredictions: ['3333', '4444'],
        viewCount: 200,
      });

      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['5555', '6666'],
        aiPredictions: ['7777', '8888'],
        viewCount: 0, // 未公開
      });
    });

    it('生成統計を取得する', async () => {
      const stats = await service.getGenerationStats();

      expect(stats).toHaveProperty('totalGenerated');
      expect(stats).toHaveProperty('publishedCount');
      expect(stats).toHaveProperty('unpublishedCount');
      expect(stats).toHaveProperty('averageViewCount');

      expect(stats.totalGenerated).toBe(3);
      expect(stats.publishedCount).toBe(2);
      expect(stats.unpublishedCount).toBe(1);
      expect(stats.averageViewCount).toBe(175); // (150+200)/2
    });
  });
});