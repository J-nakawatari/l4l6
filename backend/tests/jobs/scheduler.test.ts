import { Scheduler } from '../../src/jobs/scheduler';
import { ResultFetcherJob } from '../../src/jobs/resultFetcher';
import { PredictionGeneratorJob } from '../../src/jobs/predictionGenerator';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { log } from '../../src/utils/logger';

// ジョブのモック
jest.mock('../../src/jobs/resultFetcher');
jest.mock('../../src/jobs/predictionGenerator');
jest.mock('../../src/utils/logger');

// node-cronのモック
jest.mock('node-cron', () => ({
  schedule: jest.fn((expression, callback, options) => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    getStatus: jest.fn().mockReturnValue('scheduled'),
  })),
  validate: jest.fn().mockReturnValue(true),
}));

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

describe('Scheduler', () => {
  let scheduler: Scheduler;
  let mockResultFetcher: jest.Mocked<ResultFetcherJob>;
  let mockPredictionGenerator: jest.Mocked<PredictionGeneratorJob>;

  beforeEach(() => {
    mockResultFetcher = new ResultFetcherJob(null as any, null as any) as jest.Mocked<ResultFetcherJob>;
    mockPredictionGenerator = new PredictionGeneratorJob(null as any, null as any) as jest.Mocked<PredictionGeneratorJob>;
    
    scheduler = new Scheduler();
    
    // ジョブのスケジュールを設定
    mockResultFetcher.getSchedule.mockReturnValue('0 20 * * 1,4'); // 月木 20:00
    mockPredictionGenerator.getSchedule.mockReturnValue('0 2 * * *'); // 毎日 02:00
    mockPredictionGenerator.getPublishSchedule.mockReturnValue('0 9 * * 1,4'); // 月木 09:00
  });

  describe('スケジューラーの初期化', () => {
    it('すべてのジョブをスケジュールに登録する', async () => {
      await scheduler.initialize();

      expect(scheduler.getJobCount()).toBe(3); // ResultFetcher, PredictionGenerator, PublishPredictions
      expect(log.info).toHaveBeenCalledWith('Scheduler initialized', { jobCount: 3 });
    });

    it('無効なcron式はエラーを投げる', async () => {
      mockResultFetcher.getSchedule.mockReturnValue('invalid cron expression');

      await expect(scheduler.initialize()).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('ジョブの実行', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('スケジュールに従ってジョブを実行する', async () => {
      const nodeCron = require('node-cron');
      
      // ResultFetcherジョブのコールバックを取得して実行
      const resultFetcherCall = nodeCron.schedule.mock.calls.find(
        (call: any) => call[0] === '0 20 * * 1,4'
      );
      
      mockResultFetcher.execute.mockResolvedValue({
        jobName: 'ResultFetcher',
        success: true,
        startTime: new Date(),
        endTime: new Date(),
      });

      // コールバックを実行
      await resultFetcherCall[1]();

      expect(mockResultFetcher.execute).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'Job executed successfully',
        expect.objectContaining({ jobName: 'ResultFetcher' })
      );
    });

    it('ジョブエラーをキャッチして記録する', async () => {
      const nodeCron = require('node-cron');
      
      const predictionGeneratorCall = nodeCron.schedule.mock.calls.find(
        (call: any) => call[0] === '0 2 * * *'
      );

      mockPredictionGenerator.execute.mockRejectedValue(new Error('Job failed'));

      await predictionGeneratorCall[1]();

      expect(log.error).toHaveBeenCalledWith(
        'Job execution failed',
        expect.objectContaining({
          jobName: 'PredictionGenerator',
          error: 'Job failed',
        })
      );
    });
  });

  describe('ジョブの管理', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('特定のジョブを停止する', () => {
      scheduler.stopJob('ResultFetcher');

      const job = scheduler.getJob('ResultFetcher');
      expect(job?.task.stop).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith('Job stopped', { jobName: 'ResultFetcher' });
    });

    it('特定のジョブを再開する', () => {
      scheduler.stopJob('ResultFetcher');
      scheduler.startJob('ResultFetcher');

      const job = scheduler.getJob('ResultFetcher');
      expect(job?.task.start).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith('Job started', { jobName: 'ResultFetcher' });
    });

    it('すべてのジョブを停止する', () => {
      scheduler.stopAll();

      expect(log.info).toHaveBeenCalledWith('All jobs stopped');
      scheduler.getAllJobs().forEach(job => {
        expect(job.task.stop).toHaveBeenCalled();
      });
    });

    it('存在しないジョブの操作はエラーを投げる', () => {
      expect(() => scheduler.stopJob('NonExistentJob')).toThrow('Job not found');
      expect(() => scheduler.startJob('NonExistentJob')).toThrow('Job not found');
    });
  });

  describe('ジョブのステータス', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('全ジョブのステータスを取得する', () => {
      const status = scheduler.getStatus();

      expect(status).toHaveLength(3);
      expect(status).toContainEqual({
        name: 'ResultFetcher',
        schedule: '0 20 * * 1,4',
        status: 'scheduled',
        nextRun: expect.any(Date),
      });
    });

    it('個別ジョブのステータスを取得する', () => {
      const status = scheduler.getJobStatus('PredictionGenerator');

      expect(status).toMatchObject({
        name: 'PredictionGenerator',
        schedule: '0 2 * * *',
        status: 'scheduled',
      });
    });

    it('実行履歴を記録する', async () => {
      mockResultFetcher.execute.mockResolvedValue({
        jobName: 'ResultFetcher',
        success: true,
        startTime: new Date(),
        endTime: new Date(),
        resultFetched: 1600,
      });

      // ジョブを手動実行
      await scheduler.runJob('ResultFetcher');

      const history = scheduler.getJobHistory('ResultFetcher');
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        jobName: 'ResultFetcher',
        success: true,
        resultFetched: 1600,
      });
    });
  });

  describe('手動実行', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('ジョブを手動で実行できる', async () => {
      mockPredictionGenerator.execute.mockResolvedValue({
        jobName: 'PredictionGenerator',
        success: true,
        startTime: new Date(),
        endTime: new Date(),
        predictionsGenerated: 1,
      });

      const result = await scheduler.runJob('PredictionGenerator');

      expect(mockPredictionGenerator.execute).toHaveBeenCalled();
      expect(result).toMatchObject({
        success: true,
        predictionsGenerated: 1,
      });
    });

    it('実行中のジョブは重複実行を防ぐ', async () => {
      // 長時間実行をシミュレート
      mockResultFetcher.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          jobName: 'ResultFetcher',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
        };
      });

      // 同時に2回実行
      const promise1 = scheduler.runJob('ResultFetcher');
      const promise2 = scheduler.runJob('ResultFetcher');

      await expect(promise2).rejects.toThrow('Job is already running');
      await promise1; // 最初の実行は成功
    });
  });

  describe('健全性チェック', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('定期的にジョブの健全性をチェックする', async () => {
      // ヘルスチェックジョブを見つける
      const nodeCron = require('node-cron');
      const healthCheckCall = nodeCron.schedule.mock.calls.find(
        (call: any) => call[0] === '*/5 * * * *' // 5分ごと
      );

      // 正常なケース
      await healthCheckCall[1]();

      expect(log.info).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({ healthyJobs: 3 })
      );
    });

    it('異常なジョブを検出して再起動する', async () => {
      // ジョブを停止状態にする
      const job = scheduler.getJob('ResultFetcher');
      job!.task.getStatus = jest.fn().mockReturnValue('stopped');

      await scheduler.healthCheck();

      expect(log.warn).toHaveBeenCalledWith(
        'Unhealthy job detected, restarting',
        { jobName: 'ResultFetcher' }
      );
      expect(job!.task.start).toHaveBeenCalled();
    });
  });

  describe('グレースフルシャットダウン', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('シャットダウン時にすべてのジョブを停止する', async () => {
      await scheduler.shutdown();

      scheduler.getAllJobs().forEach(job => {
        expect(job.task.destroy).toHaveBeenCalled();
      });
      expect(log.info).toHaveBeenCalledWith('Scheduler shutdown complete');
    });

    it('実行中のジョブの完了を待つ', async () => {
      // 実行中のジョブをシミュレート
      let jobCompleted = false;
      mockResultFetcher.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        jobCompleted = true;
        return {
          jobName: 'ResultFetcher',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
        };
      });

      // ジョブを開始
      const jobPromise = scheduler.runJob('ResultFetcher');

      // すぐにシャットダウン
      await scheduler.shutdown();

      // ジョブが完了していることを確認
      expect(jobCompleted).toBe(true);
      await jobPromise;
    });
  });

  describe('設定の動的変更', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('ジョブのスケジュールを変更できる', () => {
      scheduler.updateJobSchedule('PredictionGenerator', '0 3 * * *'); // 03:00に変更

      const job = scheduler.getJob('PredictionGenerator');
      expect(job?.schedule).toBe('0 3 * * *');
      expect(job?.task.stop).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'Job schedule updated',
        { jobName: 'PredictionGenerator', newSchedule: '0 3 * * *' }
      );
    });

    it('無効なスケジュールは拒否する', () => {
      expect(() => {
        scheduler.updateJobSchedule('ResultFetcher', 'invalid schedule');
      }).toThrow('Invalid cron expression');
    });
  });

  describe('メトリクス', () => {
    beforeEach(async () => {
      await scheduler.initialize();
      
      // いくつかのジョブを実行
      mockResultFetcher.execute.mockResolvedValue({
        jobName: 'ResultFetcher',
        success: true,
        startTime: new Date(),
        endTime: new Date(),
        duration: 1500,
      });

      mockPredictionGenerator.execute
        .mockResolvedValueOnce({
          jobName: 'PredictionGenerator',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 2000,
        })
        .mockRejectedValueOnce(new Error('Failed'));

      await scheduler.runJob('ResultFetcher');
      await scheduler.runJob('PredictionGenerator');
      await scheduler.runJob('PredictionGenerator').catch(() => {});
    });

    it('ジョブ実行メトリクスを取得する', () => {
      const metrics = scheduler.getMetrics();

      expect(metrics).toMatchObject({
        totalJobs: 3,
        totalExecutions: 3,
        successfulExecutions: 2,
        failedExecutions: 1,
        averageExecutionTime: expect.any(Number),
        jobMetrics: {
          ResultFetcher: {
            executions: 1,
            successes: 1,
            failures: 0,
            averageTime: 1500,
          },
          PredictionGenerator: {
            executions: 2,
            successes: 1,
            failures: 1,
            averageTime: 2000,
          },
        },
      });
    });
  });
});