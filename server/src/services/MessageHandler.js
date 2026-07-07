import { extractYouTubeId } from '../utils/youtube.js';

export class MessageHandler {
  constructor(io, roomStore) {
    this.io = io;
    this.roomStore = roomStore;
  }

  register() {
    this.io.on('connection', (socket) => {
      this.on(socket, ['join_room', 'join-room'], this.joinRoom);
      this.on(socket, ['leave_room', 'leave-room'], this.leaveRoom);
      this.on(socket, ['play'], this.play);
      this.on(socket, ['pause'], this.pause);
      this.on(socket, ['seek'], this.seek);
      this.on(socket, ['sync_video', 'sync-video'], this.syncVideo);
      this.on(socket, ['change_video', 'change-video'], this.changeVideo);
      this.on(socket, ['playback_speed', 'playback-speed'], this.playbackSpeed);
      this.on(socket, ['queue_add', 'queue-add'], this.queueAdd);
      this.on(socket, ['next_video', 'next-video'], this.nextVideo);
      this.on(socket, ['view_mode', 'view-mode'], this.viewMode);
      this.on(socket, ['assign_role', 'assign-role'], this.assignRole);
      this.on(socket, ['transfer_host', 'transfer-host'], this.transferHost);
      this.on(socket, ['remove_participant', 'remove-user', 'remove_participant'], this.removeParticipant);
      this.on(socket, ['mute_user', 'mute-user'], this.muteUser);
      this.on(socket, ['ban_user', 'ban-user'], this.banUser);
      this.on(socket, ['chat_message', 'chat-message'], this.chatMessage);
      this.on(socket, ['typing'], this.typing);
      this.on(socket, ['reaction'], this.reaction);
      this.on(socket, ['heartbeat'], this.heartbeat);

      socket.on('disconnect', async () => this.disconnect(socket));
    });
  }

  on(socket, names, handler) {
    for (const name of names) {
      socket.on(name, (payload, callback) => this.safe(socket, callback, () => handler.call(this, socket, payload, callback)));
    }
  }

  async joinRoom(socket, payload, callback) {
    const room = this.roomStore.get(payload.roomId);
    if (!room) throw new Error('Room not found.');

    const username = String(payload.username || '').trim();
    if (!username) throw new Error('Username is required.');

    const userId = payload.userId || socket.id;
    const participant = room.join({ userId, username, socketId: socket.id });
    socket.data.roomId = room.id;
    socket.data.userId = participant.userId;
    socket.join(room.id);

    await this.roomStore.persist(room);
    this.emitRoom(room, 'participant-joined', {
      ...participant.toJSON(),
      participants: room.participantList()
    });
    socket.emit('sync_state', room.publicState());
    callback?.({ ok: true, user: participant.toJSON(), state: room.publicState() });
  }

  async leaveRoom(socket) {
    await this.disconnect(socket);
  }

  async play(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      room.play(payload?.time);
      await this.persistAndSync(room, 'play');
    });
  }

  async pause(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      room.pause(payload?.time);
      await this.persistAndSync(room, 'pause');
    });
  }

  async seek(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      room.seek(payload?.time);
      await this.persistAndSync(room, 'seek');
    });
  }

  async syncVideo(socket) {
    await this.withRoom(socket, async (room) => {
      socket.emit('sync_state', room.publicState());
    });
  }

  async changeVideo(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      const videoId = extractYouTubeId(payload?.videoId || payload?.videoUrl);
      if (!videoId) throw new Error('Provide a valid YouTube URL or video ID.');
      room.changeVideo(videoId);
      await this.persistAndSync(room, 'video-changed');
    });
  }

  async playbackSpeed(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      room.setPlaybackSpeed(payload?.speed);
      await this.persistAndSync(room, 'playback-speed');
    });
  }

  async queueAdd(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      const videoId = extractYouTubeId(payload?.videoId || payload?.videoUrl);
      if (!videoId) throw new Error('Provide a valid YouTube URL or video ID.');
      const item = room.addToQueue(videoId, socket.data.userId);
      await this.persistAndSync(room, 'queue-updated', { item });
    });
  }

  async nextVideo(socket) {
    await this.withRoom(socket, async (room) => {
      room.assertPlaybackPermission(socket.id);
      const item = room.nextVideo();
      await this.persistAndSync(room, 'video-changed', { item });
    });
  }

  async viewMode(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.setViewMode(payload || {});
      await this.persistAndSync(room, 'room-updated');
    });
  }

  async assignRole(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertHost(socket.id);
      const participant = room.assignRole(payload?.userId, payload?.role);
      await this.roomStore.persist(room);
      this.emitRoom(room, 'role-assigned', {
        ...participant.toJSON(),
        participants: room.participantList()
      });
    });
  }

  async transferHost(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertHost(socket.id);
      const participant = room.transferHost(payload?.userId);
      await this.roomStore.persist(room);
      this.emitRoom(room, 'role-assigned', {
        ...participant.toJSON(),
        participants: room.participantList()
      });
    });
  }

  async removeParticipant(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertParticipantManagement(socket.id);
      const participant = room.removeParticipant(payload?.userId);
      await this.roomStore.persist(room);
      this.io.to(participant.socketId).emit('removed_from_room', { roomId: room.id });
      this.io.sockets.sockets.get(participant.socketId)?.leave(room.id);
      this.emitRoom(room, 'participant-removed', {
        userId: participant.userId,
        participants: room.participantList()
      });
    });
  }

  async muteUser(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertParticipantManagement(socket.id);
      const participant = room.muteParticipant(payload?.userId, payload?.muted ?? true);
      this.emitRoom(room, 'room-updated', { participant, participants: room.participantList() });
    });
  }

  async banUser(socket, payload) {
    await this.withRoom(socket, async (room) => {
      room.assertParticipantManagement(socket.id);
      const participant = room.banParticipant(payload?.userId);
      this.io.to(participant.socketId).emit('removed_from_room', { roomId: room.id, banned: true });
      this.io.sockets.sockets.get(participant.socketId)?.leave(room.id);
      this.emitRoom(room, 'participant-removed', {
        userId: participant.userId,
        banned: true,
        participants: room.participantList()
      });
    });
  }

  async chatMessage(socket, payload) {
    await this.withRoom(socket, async (room) => {
      const message = room.addMessage({ userId: socket.data.userId, text: payload?.text });
      this.emitRoom(room, 'chat-message', message);
    });
  }

  async typing(socket, payload) {
    await this.withRoom(socket, async (room) => {
      const participant = room.findByUserId(socket.data.userId);
      socket.to(room.id).emit('typing', {
        userId: participant.userId,
        username: participant.username,
        typing: Boolean(payload?.typing)
      });
    });
  }

  async reaction(socket, payload) {
    await this.withRoom(socket, async (room) => {
      const reaction = room.addReaction({ userId: socket.data.userId, label: payload?.label });
      this.emitRoom(room, 'reaction', reaction);
    });
  }

  async heartbeat(socket) {
    await this.withRoom(socket, async (room) => {
      const participant = room.findBySocket(socket.id);
      socket.emit('heartbeat', { ok: true, userId: participant?.userId, at: Date.now() });
    });
  }

  async disconnect(socket) {
    const room = this.roomStore.get(socket.data.roomId);
    if (!room) return;
    const participant = room.leaveBySocket(socket.id);
    if (!participant) return;

    await this.roomStore.persist(room);
    this.emitRoom(room, 'participant-left', {
      username: participant.username,
      userId: participant.userId,
      participants: room.participantList()
    });
    this.roomStore.removeIfEmpty(room.id);
  }

  async persistAndSync(room, type, payload = {}) {
    await this.roomStore.persist(room);
    this.emitRoom(room, 'sync-video', { type, ...payload, state: room.publicState() });
    this.io.to(room.id).emit('sync_state', room.publicState());
  }

  emitRoom(room, event, payload) {
    this.io.to(room.id).emit(event, payload);
    const legacy = {
      'participant-joined': 'user_joined',
      'participant-left': 'user_left',
      'role-assigned': 'role_assigned',
      'participant-removed': 'participant_removed',
      'chat-message': 'chat_message'
    }[event];
    if (legacy) this.io.to(room.id).emit(legacy, payload);
    this.io.to(room.id).emit('notification', {
      id: `${Date.now()}-${event}`,
      type: event,
      createdAt: new Date().toISOString(),
      payload
    });
  }

  withRoom(socket, handler) {
    const room = this.roomStore.get(socket.data.roomId);
    if (!room) throw new Error('Join a room first.');
    return handler(room);
  }

  async safe(socket, callback, handler) {
    try {
      await handler();
      callback?.({ ok: true });
    } catch (error) {
      const message = error.message || 'Unexpected server error.';
      callback?.({ ok: false, message });
      socket.emit('room_error', { message });
    }
  }
}
