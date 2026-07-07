import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserModel } from '../models/UserModel.js';

export async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    const token = req.cookies?.accessToken || bearer;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await UserModel.findById(payload.sub).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };
}
