import { PredictionGeneratorJob } from '../../src/jobs/predictionGenerator';
import { Prediction } from '../../src/models/Prediction';
import { DrawResult } from '../../src/models/DrawResult';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { PredictionGeneratorService } from '../../src/services/predictionGenerator.service';
import { EmailService } from '../../src/services/email.service';
import { log } from '../../src/utils/logger';

// サービスのモック
jest.mock('../../src/services/predictionGenerator.service');
jest.mock('../../src/services/email.service');
jest.mock('../../src/utils/logger');

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

describe('PredictionGeneratorJob', () => {
  let job: PredictionGeneratorJob;
  let mockGeneratorService: jest.Mocked<PredictionGeneratorService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockGeneratorService = new PredictionGeneratorService() as jest.Mocked<PredictionGeneratorService>;
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;
    job = new PredictionGeneratorJob(mockGeneratorService, mockEmailService);
  });

  describe('予想生成タスク', () => {
    it('次回抽選の予想を生成する', async () => {
      const mockPrediction = {
        drawNumber: 1601,
        drawDate: new Date('2024-01-22'),
        dataLogicPredictions: ['1234', '5678', '9012', '3456'],
        aiPredictions: ['2345', '6789', '0123', '4567'],
      };

      mockGeneratorService.generateNewPrediction.mockResolvedValue(mockPrediction);

      await job.generateNextPrediction();

      expect(mockGeneratorService.generateNewPrediction).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'Prediction generated successfully',
        expect.objectContaining({ drawNumber: 1601 })
      );
    });

    it('生成エラー時はリトライする', async () => {
      mockGeneratorService.generateNewPrediction
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({
          drawNumber: 1601,
          drawDate: new Date('2024-01-22'),
          dataLogicPredictions: ['1234'],
          aiPredictions: ['5678'],
        });

      await job.generateNextPrediction();

      expect(mockGeneratorService.generateNewPrediction).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ後は管理者に通知する', async () => {
      mockGeneratorService.generateNewPrediction.mockRejectedValue(
        new Error('Permanent failure')
      );

      await expect(job.generateNextPrediction()).rejects.toThrow();

      expect(mockEmailService.sendAdminAlert).toHaveBeenCalledWith(
        'Prediction Generation Failed',
        expect.stringContaining('Permanent failure')
      );
    });
  });

  describe('バッチ生成', () => {
    it('指定された数の予想を生成する', async () => {
      const mockPredictions = [
        {
          drawNumber: 1601,
          drawDate: new Date('2024-01-22'),
          dataLogicPredictions: ['1111'],
          aiPredictions: ['2222'],
        },
        {
          drawNumber: 1602,
          drawDate: new Date('2024-01-25'),
          dataLogicPredictions: ['3333'],
          aiPredictions: ['4444'],
        },
        {
          drawNumber: 1603,
          drawDate: new Date('2024-01-29'),
          dataLogicPredictions: ['5555'],
          aiPredictions: ['6666'],
        },
      ];

      mockGeneratorService.generateBatchPredictions.mockResolvedValue(mockPredictions);

      await job.generateBatch(3);

      expect(mockGeneratorService.generateBatchPredictions).toHaveBeenCalledWith(3);
      expect(log.info).toHaveBeenCalledWith(
        'Batch predictions generated',
        { count: 3, drawNumbers: [1601, 1602, 1603] }
      );
    });

    it('週末に1週間分の予想を生成する', async () => {
      const now = new Date('2024-01-20T10:00:00'); // 土曜日
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      await job.generateWeeklyBatch();

      // 月曜日と木曜日の2回分
      expect(mockGeneratorService.generateBatchPredictions).toHaveBeenCalledWith(2);
    });
  });

  describe('予想の自動公開', () => {
    beforeEach(async () => {
      // 未公開の予想を作成
      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-18T18:00:00'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 0,
      });

      await Prediction.create({
        drawNumber: 1601,
        drawDate: new Date('2024-01-22T18:00:00'),
        dataLogicPredictions: ['2345'],
        aiPredictions: ['6789'],
        viewCount: 0,
      });
    });

    it('抽選日当日の朝に予想を公開する', async () => {
      const now = new Date('2024-01-18T09:00:00');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      mockGeneratorService.publishPrediction = jest.fn().mockResolvedValue(true);

      await job.publishTodaysPredictions();

      expect(mockGeneratorService.publishPrediction).toHaveBeenCalledWith(1600);
      expect(mockGeneratorService.publishPrediction).not.toHaveBeenCalledWith(1601);
    });

    it('公開失敗時はエラーログを記録する', async () => {
      const now = new Date('2024-01-18T09:00:00');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      mockGeneratorService.publishPrediction = jest.fn()
        .mockRejectedValue(new Error('Publish failed'));

      await job.publishTodaysPredictions();

      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish prediction',
        expect.objectContaining({ drawNumber: 1600 })
      );
    });
  });

  describe('スケジューリング', () => {
    it('毎日深夜に実行される', () => {
      const schedule = job.getSchedule();
      
      // 毎日 02:00 に実行
      expect(schedule).toMatch(/0 2 \* \* \*/);
    });

    it('公開タスクは抽選日の朝に実行される', () => {
      const publishSchedule = job.getPublishSchedule();
      
      // 月曜日と木曜日の 09:00 に実行
      expect(publishSchedule).toMatch(/0 9 \* \* 1,4/);
    });

    it('実行ログを記録する', async () => {
      mockGeneratorService.generateNewPrediction.mockResolvedValue({
        drawNumber: 1601,
        drawDate: new Date('2024-01-22'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
      });

      const result = await job.execute();

      expect(result).toHaveProperty('jobName', 'PredictionGenerator');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('predictionsGenerated', 1);
    });
  });

  describe('健全性チェック', () => {
    it('過去の日付の予想は生成しない', async () => {
      // 過去の日付を返すように設定
      mockGeneratorService.getNextDrawNumber.mockResolvedValue(1600);
      jest.spyOn(mockGeneratorService, 'getNextDrawDate')
        .mockReturnValue(new Date('2024-01-01')); // 過去の日付

      await expect(job.generateNextPrediction()).rejects.toThrow('past date');
    });

    it('重複する予想番号は生成しない', async () => {
      // 既存の予想
      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-18'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 100,
      });

      mockGeneratorService.generateNewPrediction.mockRejectedValue(
        new Error('Prediction already exists for draw number 1600')
      );

      await expect(job.generateNextPrediction()).rejects.toThrow('already exists');
    });
  });

  describe('パフォーマンス監視', () => {
    it('生成時間を記録する', async () => {
      mockGeneratorService.generateNewPrediction.mockImplementation(async () => {
        // 1秒の遅延をシミュレート
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          drawNumber: 1601,
          drawDate: new Date('2024-01-22'),
          dataLogicPredictions: ['1234'],
          aiPredictions: ['5678'],
        };
      });

      const startTime = Date.now();
      await job.generateNextPrediction();
      const endTime = Date.now();

      expect(log.info).toHaveBeenCalledWith(
        'Prediction generated successfully',
        expect.objectContaining({
          generationTime: expect.any(Number),
        })
      );

      // 生成時間が記録されていることを確認
      const logCall = (log.info as jest.Mock).mock.calls.find(
        call => call[0] === 'Prediction generated successfully'
      );
      expect(logCall[1].generationTime).toBeGreaterThanOrEqual(1000);
    });

    it('遅い生成には警告を出す', async () => {
      mockGeneratorService.generateNewPrediction.mockImplementation(async () => {
        // 5秒の遅延（しきい値を超える）
        await new Promise(resolve => setTimeout(resolve, 5000));
        return {
          drawNumber: 1601,
          drawDate: new Date('2024-01-22'),
          dataLogicPredictions: ['1234'],
          aiPredictions: ['5678'],
        };
      });

      await job.generateNextPrediction();

      expect(log.warn).toHaveBeenCalledWith(
        'Slow prediction generation detected',
        expect.objectContaining({
          generationTime: expect.any(Number),
          threshold: 3000,
        })
      );
    });
  });

  describe('クリーンアップタスク', () => {
    it('古い未公開予想を削除する', async () => {
      // 30日以上前の未公開予想
      await Prediction.create({
        drawNumber: 1500,
        drawDate: new Date('2023-12-01'),
        dataLogicPredictions: ['1234'],
        aiPredictions: ['5678'],
        viewCount: 0,
        createdAt: new Date('2023-11-30'),
      });

      // 最近の未公開予想
      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['2345'],
        aiPredictions: ['6789'],
        viewCount: 0,
        createdAt: new Date('2024-01-14'),
      });

      await job.cleanupOldUnpublishedPredictions();

      // 古い予想は削除される
      const oldPrediction = await Prediction.findOne({ drawNumber: 1500 });
      expect(oldPrediction).toBeNull();

      // 新しい予想は残る
      const recentPrediction = await Prediction.findOne({ drawNumber: 1600 });
      expect(recentPrediction).toBeDefined();
    });
  });

  describe('統合テスト', () => {
    it('完全な予想生成フローを実行する', async () => {
      // 最新の抽選結果を作成
      await DrawResult.create({
        drawNumber: 1599,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [5, 12, 23, 31, 38, 42],
        winningNumber: '0512',
        prize: { amount: 200000000, winners: 1 },
      });

      mockGeneratorService.getNextDrawNumber.mockResolvedValue(1600);
      mockGeneratorService.generateNewPrediction.mockResolvedValue({
        drawNumber: 1600,
        drawDate: new Date('2024-01-18'),
        dataLogicPredictions: ['1234', '5678', '9012', '3456'],
        aiPredictions: ['2345', '6789', '0123', '4567'],
      });

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(mockGeneratorService.generateNewPrediction).toHaveBeenCalled();
      
      // 成功通知（管理者向け）
      expect(mockEmailService.sendAdminNotification).toHaveBeenCalledWith(
        'Prediction Generation Complete',
        expect.objectContaining({
          drawNumber: 1600,
          predictionsGenerated: 1,
        })
      );
    });
  });
});