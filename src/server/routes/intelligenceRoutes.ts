import { Router } from 'express';
import { getDashboardAnalytics, getHeatmapData, getIntelligenceBriefing } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, authorize(['admin', 'super_admin', 'tanod']), getDashboardAnalytics);
router.post('/briefing', authenticate, authorize(['admin', 'super_admin']), getIntelligenceBriefing);
router.get('/heatmap', authenticate, authorize(['admin', 'super_admin']), getHeatmapData);

export default router;
