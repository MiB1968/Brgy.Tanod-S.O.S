import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sosController from '../controllers/sosController';
import { sosRateLimiter, strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// === HIGH RISK EMERGENCY ENDPOINTS ===
router.post(
  '/alert',
  authenticate,
  sosRateLimiter,           // ← Very important
  sosController.createSOS
);

router.post(
  '/alert/:id/cancel',
  authenticate,
  sosController.cancelSOS
);

router.get(
  '/active',
  authenticate,
  sosController.getActiveAlerts
);

router.post(
  '/nearest',
  authenticate,
  strictRateLimiter,
  sosController.findNearest
);

router.patch(
  '/alert/:id',
  authenticate,
  sosController.updateSOS
);

export default router;

