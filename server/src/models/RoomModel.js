import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    userId: String,
    username: String,
    role: {
      type: String,
      enum: ['Host', 'Moderator', 'Participant', 'Viewer'],
      default: 'Participant'
    }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true, index: true },
    videoId: String,
    playState: { type: String, enum: ['playing', 'paused'], default: 'paused' },
    currentTime: { type: Number, default: 0 },
    playbackSpeed: { type: Number, default: 1 },
    participants: [participantSchema],
    queue: [mongoose.Schema.Types.Mixed],
    metadata: {
      roomName: String,
      description: String,
      visibility: { type: String, enum: ['public', 'private'], default: 'public' },
      maxParticipants: Number,
      passwordProtected: Boolean,
      waitingRoom: Boolean,
      autoDelete: Boolean,
      theme: String
    }
  },
  { timestamps: true }
);

export const RoomModel = mongoose.models.Room || mongoose.model('Room', roomSchema);
