import { Response, NextFunction } from 'express';
import { PredictionService } from '../services/prediction.service';
import { predictionQuerySchema, predictionIdSchema } from '../validation/prediction.validation';
import { log } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth.types';

const predictionService = new PredictionService();

export const listPredictions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value } = predictionQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || 'Validation error',
        },
      });
      return;
    }

    const userId = req.user?._id?.toString() || req.user?.id;
    const result = await predictionService.listPredictions(value, userId);

    log.info('Predictions listed', { 
      page: value.page, 
      limit: value.limit,
      total: result.pagination.total,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPredictionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { error } = predictionIdSchema.validate({ id: req.params.id });
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || 'Validation error',
        },
      });
      return;
    }

    const userId = req.user?._id?.toString() || req.user?.id;
    const result = await predictionService.getPredictionById(req.params.id || '', userId);

    log.info('Prediction viewed', { 
      predictionId: req.params.id,
      userId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getLatestPrediction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 認証必須
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // サブスクリプション確認
    const hasActiveSubscription = req.user.subscription?.status === 'active' && 
      req.user.subscription.currentPeriodEnd !== undefined &&
      new Date(req.user.subscription.currentPeriodEnd) > new Date();
    
    // 期限切れチェック
    if (req.user.subscription?.status === 'active' && 
        req.user.subscription.currentPeriodEnd !== undefined &&
        new Date(req.user.subscription.currentPeriodEnd) < new Date()) {
      res.status(403).json({
        error: {
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired',
        },
      });
      return;
    }

    const result = await predictionService.getLatestPrediction(req.user.id, hasActiveSubscription);

    log.info('Latest prediction viewed', { 
      userId: req.user.id,
      predictionId: result.prediction.id,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserPredictionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 認証必須
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { page = 1, limit = 10, type, winOnly } = req.query;
    
    const query: any = {};
    
    // フィルタリング条件を構築
    if (type === 'dataLogic') {
      query['predictions.dataLogic'] = { $exists: true, $ne: [] };
      query['predictions.ai'] = { $size: 0 };
    } else if (type === 'ai') {
      query['predictions.ai'] = { $exists: true, $ne: [] };
      query['predictions.dataLogic'] = { $size: 0 };
    }
    
    if (winOnly === 'true') {
      query['result.isWin'] = true;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const result = await predictionService.getUserPredictionHistory(
      req.user._id?.toString() || req.user.id as string,
      query,
      pageNum,
      limitNum
    );

    log.info('User prediction history viewed', { 
      userId: req.user._id,
      page: pageNum,
      total: result.totalPages,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};