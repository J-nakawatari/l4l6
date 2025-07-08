import { Router } from 'express';
import { 
  getOverviewAnalytics, 
  getRevenueAnalytics, 
  getUserAnalytics, 
  getPredictionAnalytics,
  exportAnalytics 
} from '../../controllers/admin/analytics.controller';

const router = Router();

router.get('/', getOverviewAnalytics);
router.get('/revenue', getRevenueAnalytics);
router.get('/users', getUserAnalytics);
router.get('/predictions', getPredictionAnalytics);
router.post('/export', exportAnalytics);

export default router;