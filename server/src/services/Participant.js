export class Participant {
  constructor({ userId, username, role = 'Participant', socketId }) {
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.socketId = socketId;
    this.joinedAt = new Date().toISOString();
    this.online = true;
    this.muted = false;
    this.banned = false;
    this.microphone = false;
    this.connectionQuality = 'good';
    this.device = 'browser';
  }

  canControlPlayback() {
    return this.role === 'Host' || this.role === 'Moderator';
  }

  canManageRoom() {
    return this.role === 'Host';
  }

  canManageParticipants() {
    return this.role === 'Host' || this.role === 'Moderator';
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt,
      online: this.online,
      muted: this.muted,
      microphone: this.microphone,
      connectionQuality: this.connectionQuality,
      device: this.device
    };
  }
}
