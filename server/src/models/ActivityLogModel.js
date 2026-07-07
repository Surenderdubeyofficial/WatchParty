import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actorId: String,
    action: String,
    entityType: String,
    entityId: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
