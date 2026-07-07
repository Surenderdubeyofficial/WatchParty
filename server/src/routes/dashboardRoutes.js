import { Router } from 'express';
import { createDashboardController } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

export function dashboardRouter(roomStore) {
  const router = Router();
  const controller = createDashboardController(roomStore);
  router.get('/summary', requireAuth, controller.summary);
  return router;
}
