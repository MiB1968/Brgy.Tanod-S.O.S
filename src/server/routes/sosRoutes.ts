import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sosController from '../controllers/sosController';

const router = Router();

router.post('/alert', authenticate, sosController.createAlert);
router.post('/alert/:id/cancel', authenticate, sosController.cancelAlert);
router.get('/active', authenticate, sosController.getActiveAlerts);

export default router;
