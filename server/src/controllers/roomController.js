import { asyncHandler } from '../utils/asyncHandler.js';
import { extractYouTubeId } from '../utils/youtube.js';

export function createRoomController(roomStore) {
  return {
    create: asyncHandler(async (req, res) => {
      const { username, videoUrl, roomName, description, visibility, maxParticipants, password } = req.body;
      const displayName = username?.trim() || req.user?.username;
      if (!displayName) return res.status(400).json({ message: 'Username is required.' });

      const room = await roomStore.createRoom({
        hostName: displayName,
        videoId: extractYouTubeId(videoUrl) || 'ZciHhpRNmMY',
        metadata: {
          roomName: roomName?.trim() || `${displayName}'s Watch Room`,
          description: description?.trim() || '',
          visibility: visibility || 'public',
          maxParticipants: Number(maxParticipants || 50),
          passwordProtected: Boolean(password),
          theme: 'cinema'
        }
      });

      res.status(201).json({
        roomId: room.id,
        joinUrl: `/room/${room.id}`,
        videoId: room.state.videoId,
        metadata: room.metadata
      });
    }),

    show: asyncHandler(async (req, res) => {
      const room = roomStore.get(req.params.roomId);
      if (!room) return res.status(404).json({ message: 'Room not found.' });
      res.json(room.publicState());
    }),

    list: asyncHandler(async (_req, res) => {
      res.json({ rooms: roomStore.listPublic() });
    }),

    remove: asyncHandler(async (req, res) => {
      const removed = roomStore.remove(req.params.roomId);
      res.json({ ok: removed });
    })
  };
}
