import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    title: String,
    body: String,
    readAt: Date,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
