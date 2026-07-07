import { io } from 'socket.io-client';

const SERVER = 'http://localhost:5000';
const ROOM = process.argv[2] || 'H9A7IQHZ';
const USERID = 'test-node-client';

const socket = io(SERVER, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('join_room', { roomId: ROOM, username: 'NodeTester', userId: USERID }, (res) => {
    console.log('join response', res);
    setTimeout(() => socket.disconnect(), 1000);
  });
});

socket.on('sync_state', (state) => {
  console.log('sync_state', state.roomId, state.videoId, 'participants', state.participants.length);
});

socket.on('connect_error', (err) => console.error('connect_error', err.message));

socket.on('room_error', (err) => console.error('room_error', err));
