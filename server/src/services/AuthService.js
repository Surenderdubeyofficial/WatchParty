import bcrypt from 'bcryptjs';
import validator from 'validator';
import { UserModel } from '../models/UserModel.js';
import { setAuthCookies, clearAuthCookies } from '../utils/tokens.js';

export class AuthService {
  static publicUser(user) {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      theme: user.theme,
      language: user.language,
      emailVerified: user.emailVerified,
      notificationPreferences: user.notificationPreferences
    };
  }

  static async register({ username, email, password }, res) {
    if (!username?.trim() || !email?.trim() || !password) {
      const error = new Error('Username, email, and password are required.');
      error.statusCode = 400;
      throw error;
    }
    if (!validator.isEmail(email)) {
      const error = new Error('Enter a valid email address.');
      error.statusCode = 400;
      throw error;
    }
    if (String(password).length < 8) {
      const error = new Error('Password must be at least 8 characters.');
      error.statusCode = 400;
      throw error;
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      const error = new Error('An account with this email already exists.');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash
    });
    const tokens = setAuthCookies(res, user);
    return { user: this.publicUser(user), ...tokens };
  }

  static async login({ email, password }, res) {
    const user = await UserModel.findOne({ email: String(email || '').toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    user.lastLoginAt = new Date();
    await user.save();
    const tokens = setAuthCookies(res, user);
    return { user: this.publicUser(user), ...tokens };
  }

  static logout(res) {
    clearAuthCookies(res);
    return { ok: true };
  }
}
