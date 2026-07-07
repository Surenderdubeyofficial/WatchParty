import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const SERVER = 'http://localhost:5000';

async function createRoom() {
  const res = await fetch(`${SERVER}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Tester', videoUrl: 'https://youtu.be/ZciHhpRNmMY' })
  });
  return res.json();
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function run() {
  const room = await createRoom();
  console.log('Created room', room.roomId);

  const host = io(SERVER, { transports: ['websocket', 'polling'] });
  const guest = io(SERVER, { transports: ['websocket', 'polling'] });

  host.on('connect', () => {
    host.emit('join_room', { roomId: room.roomId, username: 'HostUser', userId: 'host-1' }, (res) => {
      console.log('host join', res.ok);
      host.emit('play', { time: 0 });
    });
  });

  guest.on('connect', () => {
    guest.emit('join_room', { roomId: room.roomId, username: 'GuestUser', userId: 'guest-1' }, (res) => {
      console.log('guest join', res.ok);
    });
  });

  guest.on('sync_state', (state) => {
    console.log('guest sync_state', state.playState, state.videoId, state.currentTime);
  });

  host.on('sync_state', (state) => console.log('host sync_state', state.playState, state.currentTime));

  await wait(1500);
  console.log('Host sends seek to 12s');
  host.emit('seek', { time: 12 });

  await wait(500);
  console.log('Host sends pause');
  host.emit('pause', { time: 12 });

  await wait(500);
  console.log('Host change video');
  host.emit('change_video', { videoUrl: 'https://youtu.be/dQw4w9WgXcQ' });

  await wait(1000);
  host.disconnect();
  guest.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
