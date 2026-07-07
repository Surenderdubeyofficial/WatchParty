import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/AuthService.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['username', 'bio', 'theme', 'language', 'avatarUrl', 'notificationPreferences'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = req.body[key];
  }
  await req.user.save();
  res.json({ user: AuthService.publicUser(req.user) });
});

export const devices = asyncHandler(async (req, res) => {
  res.json({ devices: req.user.connectedDevices || [] });
});
