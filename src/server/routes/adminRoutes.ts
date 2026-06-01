import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { adminCreateUserSchema } from '../validators/authValidator';
import { strictRateLimiter } from '../middleware/rateLimiter';
import * as adminController from '../controllers/adminController';

const router = Router();

// All admin routes require authentication + admin/superadmin role
router.use(authenticate);
router.use(authorize(['admin', 'superadmin']));

// POST /api/admin/users — create any role including admin
router.post(
  '/users',
  strictRateLimiter,
  validate(adminCreateUserSchema),
  adminController.createUser
);

// GET /api/admin/users — list all users
router.get('/users', adminController.listUsers);

// POST /api/admin/approve-resident — approve a resident and sync to firebase
router.post('/approve-resident', adminController.approveResident);

// POST /api/admin/users/resend-welcome — resend welcome email with temporary credential passcode
router.post('/users/resend-welcome', adminController.resendWelcomeEmail);

// PATCH /api/admin/users/:id/role — change a user's role
router.patch('/users/:id/role', adminController.updateUserRole);

// PATCH /api/admin/users/:id/status — verify, suspend, etc.
router.patch('/users/:id/status', adminController.updateUserStatus);

// DELETE /api/admin/users/:id — remove a user
router.delete('/users/:id', adminController.deleteUser);

export default router;
