import { Router } from 'express';
import { createRoomController } from '../controllers/roomController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function roomRouter(roomStore) {
  const router = Router();
  const controller = createRoomController(roomStore);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:roomId', controller.show);
  router.delete('/:roomId', requireAuth, requireRole('admin'), controller.remove);
  return router;
}
