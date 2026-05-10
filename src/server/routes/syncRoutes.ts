import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as syncController from '../controllers/syncController';

const router = Router();

router.get('/', authenticate, syncController.getSync);
router.post('/', authenticate, syncController.postSync);
router.delete('/', authenticate, syncController.deleteSync);

export default router;
