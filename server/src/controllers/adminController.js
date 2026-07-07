import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserModel } from '../models/UserModel.js';
import { RoomModel } from '../models/RoomModel.js';
import { MessageModel } from '../models/MessageModel.js';

export function createAdminController(roomStore) {
  return {
    overview: asyncHandler(async (_req, res) => {
      const mongoReady = mongoose.connection.readyState === 1;
      const [users, rooms, messages] = mongoReady
        ? await Promise.all([UserModel.countDocuments(), RoomModel.countDocuments(), MessageModel.countDocuments()])
        : [0, roomStore.count(), 0];

      res.json({
        users,
        rooms,
        activeRooms: roomStore.count(),
        messages,
        reports: [],
        logs: [],
        announcements: []
      });
    })
  };
}
