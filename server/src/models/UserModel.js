import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatarUrl: String,
    bio: { type: String, maxlength: 240 },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'en' },
    emailVerified: { type: Boolean, default: false },
    notificationPreferences: {
      roomActivity: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      product: { type: Boolean, default: false }
    },
    connectedDevices: [
      {
        name: String,
        lastSeenAt: Date
      }
    ],
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
