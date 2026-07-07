import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { Room } from './Room.js';
import { RoomModel } from '../models/RoomModel.js';

export class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  async createRoom({ hostName, videoId, metadata }) {
    const room = new Room({
      id: nanoid(8).toUpperCase(),
      hostName,
      videoId,
      metadata
    });
    this.rooms.set(room.id, room);
    await this.persist(room);
    return room;
  }

  get(roomId) {
    return this.rooms.get(String(roomId || '').toUpperCase());
  }

  count() {
    return this.rooms.size;
  }

  listPublic() {
    return [...this.rooms.values()]
      .filter((room) => room.metadata.visibility !== 'private')
      .map((room) => room.summary());
  }

  remove(roomId) {
    const room = this.get(roomId);
    if (!room) return false;
    return this.rooms.delete(room.id);
  }

  removeIfEmpty(roomId) {
    const room = this.get(roomId);
    if (room && room.participants.size === 0) {
      this.rooms.delete(room.id);
    }
  }

  async persist(room) {
    if (mongoose.connection.readyState !== 1) return;

    await RoomModel.findOneAndUpdate(
      { roomId: room.id },
      {
        roomId: room.id,
        videoId: room.state.videoId,
        playState: room.state.playState,
        currentTime: room.state.currentTime,
        participants: room.participantList(),
        metadata: room.metadata
      },
      { upsert: true, new: true }
    );
  }
}
