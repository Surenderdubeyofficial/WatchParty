import { Router } from 'express';
import { forgotPassword, login, logout, me, register, resetPassword, verifyEmail } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/verify-email', requireAuth, verifyEmail);
