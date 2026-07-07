import { Router } from 'express';
import { createAdminController } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function adminRouter(roomStore) {
  const router = Router();
  const controller = createAdminController(roomStore);
  router.get('/overview', requireAuth, requireRole('admin'), controller.overview);
  return router;
}
