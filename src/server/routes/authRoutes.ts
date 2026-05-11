import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/authValidator';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login',    validate(loginSchema),    authController.login);
router.post('/logout',                             authController.logout);

// FIXED: /me is now protected — unauthenticated requests get 401 automatically
router.get('/me', authenticate, authController.me);

export default router;
