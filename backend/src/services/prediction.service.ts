import { Prediction, IPrediction } from '../models/Prediction';
import { DrawResult } from '../models/DrawResult';
import { PredictionResult } from '../models/PredictionResult';
import { AppError } from '../middleware/errorHandler';
// import { log } from '../utils/logger';
import mongoose from 'mongoose';

interface PredictionQuery {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  hitsOnly?: boolean;
  userId?: string;
}

interface PredictionStats {
  totalPredictions: number;
  totalHits: number;
  hitRate: number;
  dataLogicHitRate: number;
  aiHitRate: number;
}

export class PredictionService {
  async listPredictions(query: PredictionQuery, userId?: string) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      hitsOnly = false,
    } = query;

    // 公開済みの予想のみ取得
    const filter: any = { viewCount: { $gt: 0 } };

    // 期間フィルタ
    if (startDate || endDate) {
      filter.drawDate = {};
      if (startDate) filter.drawDate.$gte = startDate;
      if (endDate) filter.drawDate.$lte = endDate;
    }

    // 的中のみフィルタ（結果と結合が必要）
    if (hitsOnly) {
      const hitPredictions = await this.getHitPredictionIds();
      filter._id = { $in: hitPredictions };
    }

    const total = await Prediction.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const predictions = await Prediction.find(filter)
      .sort('-drawNumber')
      .limit(limit)
      .skip((page - 1) * limit);

    // 各予想に結果情報を追加
    const predictionsWithResults = await Promise.all(
      predictions.map(async (prediction) => {
        const result = await this.getPredictionResult(prediction);
        const userResult = userId ? await this.getUserPredictionResult(userId, prediction._id as mongoose.Types.ObjectId) : null;
        
        return {
          id: (prediction._id as any).toString(),
          drawNumber: prediction.drawNumber,
          drawDate: prediction.drawDate,
          dataLogicPredictions: prediction.dataLogicPredictions,
          aiPredictions: prediction.aiPredictions,
          viewCount: prediction.viewCount,
          result,
          userResult,
        };
      })
    );

    // 統計情報を計算
    const stats = await this.calculateStats(filter);

    return {
      predictions: predictionsWithResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats,
    };
  }

  async getPredictionById(id: string, userId?: string | undefined) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid prediction ID', 400, 'INVALID_ID');
    }

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      throw new AppError('Prediction not found', 404, 'PREDICTION_NOT_FOUND');
    }

    // 未公開の予想は一般ユーザーは閲覧不可
    if (prediction.viewCount === 0 && !userId) {
      throw new AppError('This prediction is not yet published', 403, 'PREDICTION_NOT_PUBLISHED');
    }

    // 閲覧数をインクリメント
    await Prediction.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    const result = await this.getPredictionResult(prediction);
    const userResult = userId ? await this.getUserPredictionResult(userId, prediction._id as mongoose.Types.ObjectId) : null;

    return {
      prediction: {
        id: (prediction._id as any).toString(),
        drawNumber: prediction.drawNumber,
        drawDate: prediction.drawDate,
        dataLogicPredictions: prediction.dataLogicPredictions,
        aiPredictions: prediction.aiPredictions,
        viewCount: prediction.viewCount + 1,
        result,
        userResult,
      },
    };
  }

  async getLatestPrediction(_userId: string, hasActiveSubscription: boolean) {
    if (!hasActiveSubscription) {
      throw new AppError('Active subscription required', 403, 'SUBSCRIPTION_REQUIRED');
    }

    const latestPrediction = await Prediction.findOne()
      .sort('-drawNumber')
      .limit(1);

    if (!latestPrediction) {
      throw new AppError('No predictions available', 404, 'NO_PREDICTIONS');
    }

    // 閲覧数をインクリメント
    await Prediction.findByIdAndUpdate(latestPrediction._id, { $inc: { viewCount: 1 } });

    // ユーザーの閲覧履歴を記録（実装による）
    // 今回は簡略化のため省略

    const result = await this.getPredictionResult(latestPrediction);

    return {
      prediction: {
        id: (latestPrediction._id as any).toString(),
        drawNumber: latestPrediction.drawNumber,
        drawDate: latestPrediction.drawDate,
        dataLogicPredictions: latestPrediction.dataLogicPredictions,
        aiPredictions: latestPrediction.aiPredictions,
        viewCount: latestPrediction.viewCount + 1,
        result,
      },
    };
  }

  // ヘルパーメソッド
  private async getPredictionResult(prediction: IPrediction) {
    const drawResult = await DrawResult.findOne({ drawNumber: prediction.drawNumber });
    if (!drawResult) return null;

    const hits = {
      dataLogic: prediction.dataLogicPredictions.filter(p => p === drawResult.winningNumber),
      ai: prediction.aiPredictions.filter(p => p === drawResult.winningNumber),
    };

    const isHit = hits.dataLogic.length > 0 || hits.ai.length > 0;

    return {
      winningNumber: drawResult.winningNumber,
      isHit,
      hits,
      prize: drawResult.prize,
    };
  }

  private async getUserPredictionResult(userId: string, predictionId: mongoose.Types.ObjectId) {
    const predictionResult = await PredictionResult.findOne({
      userId,
      predictionId,
    });

    if (!predictionResult) return null;

    return {
      hits: predictionResult.hits,
      prizeWon: predictionResult.prizeWon,
    };
  }

  private async getHitPredictionIds() {
    const results = await DrawResult.find();
    const hitPredictionIds: mongoose.Types.ObjectId[] = [];

    for (const result of results) {
      const prediction = await Prediction.findOne({
        drawNumber: result.drawNumber,
        $or: [
          { dataLogicPredictions: result.winningNumber },
          { aiPredictions: result.winningNumber },
        ],
      });

      if (prediction) {
        hitPredictionIds.push(prediction._id as mongoose.Types.ObjectId);
      }
    }

    return hitPredictionIds;
  }

  private async calculateStats(filter: any): Promise<PredictionStats> {
    const predictions = await Prediction.find(filter);
    const results = await DrawResult.find();

    let totalHits = 0;
    let dataLogicHits = 0;
    let aiHits = 0;

    for (const prediction of predictions) {
      const result = results.find(r => r.drawNumber === prediction.drawNumber);
      if (result) {
        const hasDataLogicHit = prediction.dataLogicPredictions.includes(result.winningNumber);
        const hasAiHit = prediction.aiPredictions.includes(result.winningNumber);

        if (hasDataLogicHit || hasAiHit) {
          totalHits++;
        }
        if (hasDataLogicHit) {
          dataLogicHits++;
        }
        if (hasAiHit) {
          aiHits++;
        }
      }
    }

    const totalPredictions = predictions.length;

    return {
      totalPredictions,
      totalHits,
      hitRate: totalPredictions > 0 ? (totalHits / totalPredictions) * 100 : 0,
      dataLogicHitRate: totalPredictions > 0 ? (dataLogicHits / totalPredictions) * 100 : 0,
      aiHitRate: totalPredictions > 0 ? (aiHits / totalPredictions) * 100 : 0,
    };
  }
}