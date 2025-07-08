import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { listPredictions, getPredictionById, getLatestPrediction, getUserPredictionHistory } from '../controllers/prediction.controller';

const router = Router();

// 公開エンドポイント（認証は任意）
router.get('/', optionalAuthenticate, listPredictions);

// 認証が必要なエンドポイント（順序重要）
router.get('/latest', authenticate, getLatestPrediction);
router.get('/history', authenticate, getUserPredictionHistory);

// 公開エンドポイント（認証は任意、パラメータ付きは最後に）
router.get('/:id', optionalAuthenticate, getPredictionById);

export default router;