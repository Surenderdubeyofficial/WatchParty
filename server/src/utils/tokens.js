import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: '15m' });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, env.jwtRefreshSecret, { expiresIn: '7d' });
}

export function setAuthCookies(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const cookieBase = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure
  };

  res.cookie('accessToken', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { accessToken, refreshToken };
}

export function clearAuthCookies(res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}
