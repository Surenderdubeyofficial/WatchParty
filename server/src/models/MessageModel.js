import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, index: true },
    userId: String,
    username: String,
    role: String,
    text: { type: String, maxlength: 500 },
    editedAt: Date,
    deletedAt: Date,
    replyTo: String,
    reactions: [{ label: String, userId: String }]
  },
  { timestamps: true }
);

export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
