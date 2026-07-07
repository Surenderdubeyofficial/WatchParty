import { Participant } from './Participant.js';

const ROLES = new Set(['Host', 'Moderator', 'Participant', 'Viewer']);

export class Room {
  constructor({ id, videoId, hostName, metadata = {} }) {
    this.id = id;
    this.metadata = {
      roomName: metadata.roomName || `${hostName}'s Watch Room`,
      description: metadata.description || '',
      visibility: metadata.visibility || 'public',
      maxParticipants: metadata.maxParticipants || 50,
      passwordProtected: Boolean(metadata.passwordProtected),
      waitingRoom: Boolean(metadata.waitingRoom),
      autoDelete: metadata.autoDelete ?? true,
      theme: metadata.theme || 'cinema',
      createdAt: new Date().toISOString()
    };
    this.state = {
      playState: 'paused',
      currentTime: 0,
      videoId,
      playbackSpeed: 1,
      theaterMode: false,
      miniPlayer: false,
      updatedAt: Date.now()
    };
    this.queue = [];
    this.bannedUsers = new Set();
    this.participants = new Map();
    this.chat = [];
    this.initialHostName = hostName;
  }

  join({ userId, username, socketId }) {
    if (this.bannedUsers.has(userId)) throw new Error('You are banned from this room.');
    if (this.participants.size >= this.metadata.maxParticipants) throw new Error('This room is full.');

    const existing = this.participants.get(userId);
    if (existing) {
      existing.socketId = socketId;
      existing.online = true;
      return existing;
    }

    const hasHost = [...this.participants.values()].some((user) => user.role === 'Host');
    const participant = new Participant({
      userId,
      username,
      socketId,
      role: hasHost ? 'Participant' : 'Host'
    });

    this.participants.set(userId, participant);
    return participant;
  }

  leaveBySocket(socketId) {
    const participant = this.findBySocket(socketId);
    if (!participant) return null;

    this.participants.delete(participant.userId);
    if (participant.role === 'Host') this.promoteFirstAvailableHost();
    return participant;
  }

  findBySocket(socketId) {
    return [...this.participants.values()].find((user) => user.socketId === socketId);
  }

  findByUserId(userId) {
    return this.participants.get(userId);
  }

  assertPlaybackPermission(socketId) {
    const participant = this.findBySocket(socketId);
    if (!participant?.canControlPlayback()) {
      throw new Error('Only Host or Moderator can control playback.');
    }
    return participant;
  }

  assertHost(socketId) {
    const participant = this.findBySocket(socketId);
    if (!participant?.canManageRoom()) {
      throw new Error('Only Host can manage roles and participants.');
    }
    return participant;
  }

  assertParticipantManagement(socketId) {
    const participant = this.findBySocket(socketId);
    if (!participant?.canManageParticipants()) {
      throw new Error('Only Host or Moderator can remove or moderate participants.');
    }
    return participant;
  }

  play(time) {
    this.state.playState = 'playing';
    this.updateTime(time);
  }

  pause(time) {
    this.state.playState = 'paused';
    this.updateTime(time);
  }

  seek(time) {
    this.updateTime(time);
  }

  changeVideo(videoId) {
    this.state.videoId = videoId;
    this.state.currentTime = 0;
    this.state.playState = 'paused';
    this.state.updatedAt = Date.now();
  }

  setPlaybackSpeed(speed) {
    const nextSpeed = Number(speed);
    if (![0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(nextSpeed)) {
      throw new Error('Invalid playback speed.');
    }
    this.state.playbackSpeed = nextSpeed;
    this.state.updatedAt = Date.now();
  }

  setViewMode({ theaterMode, miniPlayer }) {
    if (typeof theaterMode === 'boolean') this.state.theaterMode = theaterMode;
    if (typeof miniPlayer === 'boolean') this.state.miniPlayer = miniPlayer;
  }

  addToQueue(videoId, addedBy) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      videoId,
      addedBy,
      createdAt: new Date().toISOString()
    };
    this.queue.push(item);
    this.queue = this.queue.slice(-40);
    return item;
  }

  nextVideo() {
    const next = this.queue.shift();
    if (!next) throw new Error('Queue is empty.');
    this.changeVideo(next.videoId);
    return next;
  }

  updateTime(time) {
    const nextTime = Number(time);
    this.state.currentTime = Number.isFinite(nextTime) && nextTime >= 0 ? nextTime : this.state.currentTime;
    this.state.updatedAt = Date.now();
  }

  effectiveCurrentTime() {
    if (this.state.playState !== 'playing') return this.state.currentTime;
    const elapsedSeconds = (Date.now() - this.state.updatedAt) / 1000;
    return Math.max(0, this.state.currentTime + elapsedSeconds);
  }

  assignRole(userId, role) {
    if (!ROLES.has(role)) throw new Error('Invalid role.');
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');
    if (role === 'Host') this.transferHost(userId);
    else participant.role = role;
    return participant;
  }

  transferHost(userId) {
    const nextHost = this.findByUserId(userId);
    if (!nextHost) throw new Error('Participant not found.');
    for (const participant of this.participants.values()) {
      if (participant.role === 'Host') participant.role = 'Moderator';
    }
    nextHost.role = 'Host';
    return nextHost;
  }

  removeParticipant(userId) {
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');
    if (participant.role === 'Host') throw new Error('Transfer host before removing the host.');
    this.participants.delete(userId);
    return participant;
  }

  muteParticipant(userId, muted = true) {
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');
    participant.muted = Boolean(muted);
    return participant;
  }

  banParticipant(userId) {
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');
    if (participant.role === 'Host') throw new Error('Transfer host before banning the host.');
    this.bannedUsers.add(userId);
    this.participants.delete(userId);
    return participant;
  }

  addMessage({ userId, text }) {
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');

    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      username: participant.username,
      role: participant.role,
      text: String(text || '').slice(0, 280),
      createdAt: new Date().toISOString()
    };

    if (!message.text.trim()) throw new Error('Message cannot be empty.');
    this.chat.push(message);
    this.chat = this.chat.slice(-50);
    return message;
  }

  addReaction({ userId, label }) {
    const participant = this.findByUserId(userId);
    if (!participant) throw new Error('Participant not found.');

    const cleanLabel = String(label || '').trim().slice(0, 18);
    if (!cleanLabel) throw new Error('Reaction cannot be empty.');

    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      username: participant.username,
      label: cleanLabel,
      createdAt: new Date().toISOString()
    };
  }

  promoteFirstAvailableHost() {
    const next = [...this.participants.values()][0];
    if (next) next.role = 'Host';
  }

  participantList() {
    return [...this.participants.values()].map((user) => user.toJSON());
  }

  summary() {
    return {
      roomId: this.id,
      metadata: this.metadata,
      videoId: this.state.videoId,
      playState: this.state.playState,
      participantCount: this.participants.size,
      createdAt: this.metadata.createdAt
    };
  }

  publicState() {
    return {
      roomId: this.id,
      metadata: this.metadata,
      playState: this.state.playState,
      currentTime: this.effectiveCurrentTime(),
      videoId: this.state.videoId,
      playbackSpeed: this.state.playbackSpeed,
      theaterMode: this.state.theaterMode,
      miniPlayer: this.state.miniPlayer,
      queue: this.queue,
      participants: this.participantList(),
      chat: this.chat
    };
  }
}
