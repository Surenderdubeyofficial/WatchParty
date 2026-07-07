import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    roomId: String,
    videoId: String,
    title: String,
    watchedSeconds: { type: Number, default: 0 },
    lastWatchedAt: Date,
    favorite: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const WatchHistoryModel = mongoose.models.WatchHistory || mongoose.model('WatchHistory', watchHistorySchema);
