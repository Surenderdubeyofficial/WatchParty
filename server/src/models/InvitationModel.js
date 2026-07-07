import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    roomId: { type: String, index: true },
    email: String,
    token: { type: String, index: true },
    invitedBy: String,
    acceptedAt: Date,
    expiresAt: Date
  },
  { timestamps: true }
);

export const InvitationModel = mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);
