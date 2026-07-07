import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { RoomModel } from '../models/RoomModel.js';
import { UserModel } from '../models/UserModel.js';
import { MessageModel } from '../models/MessageModel.js';
import { WatchHistoryModel } from '../models/WatchHistoryModel.js';

export function createDashboardController(roomStore) {
  return {
    summary: asyncHandler(async (req, res) => {
      const mongoReady = mongoose.connection.readyState === 1;
      const [totalRooms, totalUsers, totalMessages, watchRows] = mongoReady
        ? await Promise.all([
            RoomModel.countDocuments(),
            UserModel.countDocuments(),
            MessageModel.countDocuments(),
            WatchHistoryModel.find({ userId: req.user?._id }).sort({ updatedAt: -1 }).limit(8)
          ])
        : [roomStore.count(), 1, 0, []];

      res.json({
        cards: {
          totalRooms,
          activeRooms: roomStore.count(),
          totalUsers,
          totalMessages,
          totalWatchTime: watchRows.reduce((sum, item) => sum + (item.watchedSeconds || 0), 0)
        },
        recentRooms: roomStore.listPublic().slice(0, 6),
        favoriteVideos: watchRows.filter((item) => item.favorite).slice(0, 6),
        chart: [
          { label: 'Mon', users: 24, rooms: 8, messages: 120 },
          { label: 'Tue', users: 30, rooms: 11, messages: 180 },
          { label: 'Wed', users: 44, rooms: 18, messages: 260 },
          { label: 'Thu', users: 41, rooms: 15, messages: 240 },
          { label: 'Fri', users: 52, rooms: 22, messages: 330 },
          { label: 'Sat', users: 61, rooms: 26, messages: 420 }
        ],
        notifications: [
          { id: 'n1', title: 'Room sync healthy', type: 'system' },
          { id: 'n2', title: 'Invite links are enabled', type: 'room' }
        ],
        onlineFriends: []
      });
    })
  };
}
