import { Router } from 'express';
import { devices, updateProfile } from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();

profileRouter.patch('/', requireAuth, updateProfile);
profileRouter.get('/devices', requireAuth, devices);
