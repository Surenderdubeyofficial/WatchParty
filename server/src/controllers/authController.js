import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/AuthService.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body, res);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body, res);
  res.json(result);
});

export const logout = asyncHandler(async (_req, res) => {
  res.json(AuthService.logout(res));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: AuthService.publicUser(req.user) });
});

export const forgotPassword = asyncHandler(async (_req, res) => {
  res.json({ message: 'If the email exists, a reset link will be sent.' });
});

export const resetPassword = asyncHandler(async (_req, res) => {
  res.json({ message: 'Password reset endpoint is ready for email token integration.' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  req.user.emailVerified = true;
  await req.user.save();
  res.json({ user: AuthService.publicUser(req.user), message: 'Email verified.' });
});
