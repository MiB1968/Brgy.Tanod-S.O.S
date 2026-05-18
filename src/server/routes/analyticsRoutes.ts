import { Router } from 'express';
import { getDashboardAnalytics, getHeatmapData } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, authorize(['admin', 'superadmin', 'tanod']), getDashboardAnalytics);
router.get('/heatmap', authenticate, authorize(['admin', 'superadmin']), getHeatmapData);

export default router;
