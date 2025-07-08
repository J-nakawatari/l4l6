import { ResultFetcherJob } from '../../src/jobs/resultFetcher';
import { DrawResult } from '../../src/models/DrawResult';
import { PredictionResult } from '../../src/models/PredictionResult';
import { Prediction } from '../../src/models/Prediction';
import { User } from '../../src/models/User';
import { connectTestDB, closeTestDB, clearTestDB } from '../helpers/db';
import { LotteryAPIService } from '../../src/services/lotteryAPI.service';
import { EmailService } from '../../src/services/email.service';

// 外部サービスのモック
jest.mock('../../src/services/lotteryAPI.service');
jest.mock('../../src/services/email.service');

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

describe('ResultFetcherJob', () => {
  let job: ResultFetcherJob;
  let mockLotteryAPI: jest.Mocked<LotteryAPIService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockLotteryAPI = new LotteryAPIService() as jest.Mocked<LotteryAPIService>;
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;
    job = new ResultFetcherJob(mockLotteryAPI, mockEmailService);
  });

  describe('結果取得', () => {
    it('最新の抽選結果を取得して保存する', async () => {
      const mockResult = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        prize: {
          firstPrize: { amount: 200000000, winners: 1 },
          secondPrize: { amount: 10000000, winners: 5 },
          thirdPrize: { amount: 300000, winners: 123 },
          fourthPrize: { amount: 9500, winners: 6789 },
          fifthPrize: { amount: 1000, winners: 112233 },
        },
      };

      mockLotteryAPI.fetchLatestResult.mockResolvedValue(mockResult);

      await job.fetchAndSaveResult();

      // データベースに保存されていることを確認
      const saved = await DrawResult.findOne({ drawNumber: 1600 });
      expect(saved).toBeDefined();
      expect(saved!.winningNumbers).toEqual([3, 15, 22, 28, 35, 41]);
      expect(saved!.fetchedAt).toBeDefined();
    });

    it('既に存在する結果は重複保存しない', async () => {
      // 既存の結果を作成
      await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        winningNumber: '0315',
        prize: { amount: 200000000, winners: 1 },
      });

      const mockResult = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        prize: { firstPrize: { amount: 200000000, winners: 1 } },
      };

      mockLotteryAPI.fetchLatestResult.mockResolvedValue(mockResult);

      await job.fetchAndSaveResult();

      // 重複していないことを確認
      const count = await DrawResult.countDocuments({ drawNumber: 1600 });
      expect(count).toBe(1);
    });

    it('API エラー時はリトライする', async () => {
      mockLotteryAPI.fetchLatestResult
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          drawNumber: 1600,
          drawDate: new Date('2024-01-15'),
          winningNumbers: [3, 15, 22, 28, 35, 41],
          prize: { firstPrize: { amount: 200000000, winners: 1 } },
        });

      await job.fetchAndSaveResult();

      // 3回呼ばれていることを確認
      expect(mockLotteryAPI.fetchLatestResult).toHaveBeenCalledTimes(3);
      
      // 最終的に保存されていることを確認
      const saved = await DrawResult.findOne({ drawNumber: 1600 });
      expect(saved).toBeDefined();
    });

    it('最大リトライ回数を超えたらエラーを投げる', async () => {
      mockLotteryAPI.fetchLatestResult.mockRejectedValue(new Error('Permanent error'));

      await expect(job.fetchAndSaveResult()).rejects.toThrow('Failed to fetch result after');
      
      // 最大リトライ回数（デフォルト3回）呼ばれていることを確認
      expect(mockLotteryAPI.fetchLatestResult).toHaveBeenCalledTimes(3);
    });
  });

  describe('予想結果の計算', () => {
    beforeEach(async () => {
      // テスト用の予想データを作成
      await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['0315', '2228', '3541', '1122'], // 0315が的中
        aiPredictions: ['0316', '2229', '3542', '1123'], // 外れ
        viewCount: 100,
      });
    });

    it('的中した予想を識別する', async () => {
      const result = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        winningNumber: '0315',
        prize: { amount: 200000000, winners: 1 },
      });

      const hits = await job.calculatePredictionHits(result);

      expect(hits).toHaveProperty('dataLogicHits');
      expect(hits).toHaveProperty('aiHits');
      expect(hits.dataLogicHits).toContain('0315');
      expect(hits.aiHits).toHaveLength(0);
    });

    it('複数の的中を処理する', async () => {
      await Prediction.create({
        drawNumber: 1601,
        drawDate: new Date('2024-01-18'),
        dataLogicPredictions: ['0316', '0317', '0318', '0319'],
        aiPredictions: ['0316', '0320', '0321', '0322'],
        viewCount: 150,
      });

      const result = await DrawResult.create({
        drawNumber: 1601,
        drawDate: new Date('2024-01-18'),
        winningNumber: '0316',
        winningNumbers: [3, 16, 22, 28, 35, 41],
        prize: { amount: 150000000, winners: 2 },
      });

      const hits = await job.calculatePredictionHits(result);

      expect(hits.dataLogicHits).toContain('0316');
      expect(hits.aiHits).toContain('0316');
    });
  });

  describe('ユーザー結果の記録', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create({
        email: 'winner@example.com',
        password: 'password123',
        emailVerified: true,
      });
    });

    it('ユーザーの予想結果を記録する', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['0315'],
        aiPredictions: ['0316'],
        viewCount: 100,
      });

      const drawResult = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        winningNumber: '0315',
        prize: { amount: 200000000, winners: 1 },
      });

      // ユーザーが予想を使用したことを記録
      await PredictionResult.create({
        userId: user._id,
        predictionId: prediction._id,
        drawResultId: drawResult._id,
        selectedNumbers: ['0315'], // ユーザーが選んだ番号
      });

      await job.processUserResults(drawResult);

      // ユーザーの結果が更新されていることを確認
      const userResult = await PredictionResult.findOne({
        userId: user._id,
        predictionId: prediction._id,
      });

      expect(userResult!.hits).toMatchObject({
        dataLogic: ['0315'],
        ai: [],
      });
      expect(userResult!.prizeWon).toBeGreaterThan(0);
    });

    it('当選者にメール通知を送る', async () => {
      const prediction = await Prediction.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        dataLogicPredictions: ['0315'],
        aiPredictions: ['0316'],
        viewCount: 100,
      });

      const drawResult = await DrawResult.create({
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        winningNumber: '0315',
        prize: { amount: 200000000, winners: 1 },
      });

      await PredictionResult.create({
        userId: user._id,
        predictionId: prediction._id,
        drawResultId: drawResult._id,
        selectedNumbers: ['0315'],
        hits: { dataLogic: ['0315'], ai: [] },
        prizeWon: 200000000,
      });

      await job.sendWinnerNotifications(drawResult);

      expect(mockEmailService.sendWinnerNotification).toHaveBeenCalledWith(
        'winner@example.com',
        expect.objectContaining({
          drawNumber: 1600,
          winningNumber: '0315',
          prizeAmount: 200000000,
        })
      );
    });
  });

  describe('スケジューリング', () => {
    it('抽選日の夜に実行される', () => {
      const schedule = job.getSchedule();
      
      // 月曜日と木曜日の20:00に実行
      expect(schedule).toMatch(/0 20 \* \* 1,4/); // cron形式
    });

    it('実行ログを記録する', async () => {
      const mockResult = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        prize: { firstPrize: { amount: 200000000, winners: 1 } },
      };

      mockLotteryAPI.fetchLatestResult.mockResolvedValue(mockResult);

      const log = await job.execute();

      expect(log).toHaveProperty('startTime');
      expect(log).toHaveProperty('endTime');
      expect(log).toHaveProperty('success', true);
      expect(log).toHaveProperty('resultFetched', 1600);
    });

    it('エラー時もログを記録する', async () => {
      mockLotteryAPI.fetchLatestResult.mockRejectedValue(new Error('API Error'));

      const log = await job.execute();

      expect(log).toHaveProperty('success', false);
      expect(log).toHaveProperty('error');
      expect(log.error).toContain('API Error');
    });
  });

  describe('複数結果の一括取得', () => {
    it('未取得の過去結果をまとめて取得する', async () => {
      // 最新の保存済み結果
      await DrawResult.create({
        drawNumber: 1595,
        drawDate: new Date('2024-01-01'),
        winningNumbers: [1, 2, 3, 4, 5, 6],
        winningNumber: '0102',
        prize: { amount: 100000000, winners: 1 },
      });

      // API から1596-1600の結果を返す
      mockLotteryAPI.fetchResultsRange.mockResolvedValue([
        {
          drawNumber: 1596,
          drawDate: new Date('2024-01-04'),
          winningNumbers: [7, 8, 9, 10, 11, 12],
          prize: { firstPrize: { amount: 150000000, winners: 1 } },
        },
        {
          drawNumber: 1597,
          drawDate: new Date('2024-01-08'),
          winningNumbers: [13, 14, 15, 16, 17, 18],
          prize: { firstPrize: { amount: 200000000, winners: 0 } },
        },
        {
          drawNumber: 1598,
          drawDate: new Date('2024-01-11'),
          winningNumbers: [19, 20, 21, 22, 23, 24],
          prize: { firstPrize: { amount: 250000000, winners: 1 } },
        },
        {
          drawNumber: 1599,
          drawDate: new Date('2024-01-15'),
          winningNumbers: [25, 26, 27, 28, 29, 30],
          prize: { firstPrize: { amount: 100000000, winners: 3 } },
        },
        {
          drawNumber: 1600,
          drawDate: new Date('2024-01-18'),
          winningNumbers: [31, 32, 33, 34, 35, 36],
          prize: { firstPrize: { amount: 300000000, winners: 1 } },
        },
      ]);

      await job.fetchMissingResults();

      // すべての結果が保存されていることを確認
      const count = await DrawResult.countDocuments();
      expect(count).toBe(6); // 1595 + 5 new results

      // 範囲を正しく計算していることを確認
      expect(mockLotteryAPI.fetchResultsRange).toHaveBeenCalledWith(1596, 1600);
    });
  });

  describe('データ整合性チェック', () => {
    it('winningNumber フィールドを自動生成する', async () => {
      const mockResult = {
        drawNumber: 1600,
        drawDate: new Date('2024-01-15'),
        winningNumbers: [3, 15, 22, 28, 35, 41],
        prize: { firstPrize: { amount: 200000000, winners: 1 } },
      };

      mockLotteryAPI.fetchLatestResult.mockResolvedValue(mockResult);

      await job.fetchAndSaveResult();

      const saved = await DrawResult.findOne({ drawNumber: 1600 });
      // 最初の2つの数字から4桁の文字列を生成
      expect(saved!.winningNumber).toBe('0315');
    });

    it('無効なデータは保存しない', async () => {
      const invalidResults = [
        {
          drawNumber: 1600,
          // drawDate がない
          winningNumbers: [3, 15, 22, 28, 35, 41],
          prize: { firstPrize: { amount: 200000000, winners: 1 } },
        },
        {
          drawNumber: 1601,
          drawDate: new Date('2024-01-15'),
          // 数字が6個未満
          winningNumbers: [3, 15, 22, 28, 35],
          prize: { firstPrize: { amount: 200000000, winners: 1 } },
        },
        {
          drawNumber: 1602,
          drawDate: new Date('2024-01-15'),
          // 無効な数字（44は範囲外）
          winningNumbers: [3, 15, 22, 28, 35, 44],
          prize: { firstPrize: { amount: 200000000, winners: 1 } },
        },
      ];

      for (const invalidResult of invalidResults) {
        mockLotteryAPI.fetchLatestResult.mockResolvedValue(invalidResult as any);
        
        await expect(job.fetchAndSaveResult()).rejects.toThrow();
      }

      // 何も保存されていないことを確認
      const count = await DrawResult.countDocuments();
      expect(count).toBe(0);
    });
  });
});