import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiMoon, FiSun } from 'react-icons/fi';
import {
  Copy,
  Crown,
  LogIn,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SmilePlus,
  Sparkles,
  UserMinus,
  Users,
  Video
} from 'lucide-react';
import { io } from 'socket.io-client';
import { setTheme } from './store/slices/uiSlice.js';

const SERVER_URL = getServerUrl();
const USER_ID_KEY = 'watch-party-user-id';
const REACTIONS = ['Like', 'Love', 'Wow', 'Laugh', 'Clap', 'Fire', 'Party', 'Heart'];
const REACTION_EMOJI = {
  Like: '👍',
  Love: '❤️',
  Wow: '😮',
  Laugh: '😂',
  Clap: '👏',
  Fire: '🔥',
  Party: '🥳',
  Heart: '💖'
};
const DEFAULT_VIDEO_URL = 'https://youtu.be/ZciHhpRNmMY?si=hQ69qIG4cyGuFH-R';
const DEFAULT_VIDEO_ID = 'ZciHhpRNmMY';

function WatchPartyPage() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(getRoomFromPath());
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL);
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState('Create a room or join with a code.');
  const [playerNotice, setPlayerNotice] = useState('');
  const [pendingVideo, setPendingVideo] = useState('');
  const [chatText, setChatText] = useState('');
  const [chat, setChat] = useState([]);
  const [reactions, setReactions] = useState([]);
  const socketRef = useRef(null);
  const playerRef = useRef(null);
  const playerReadyRef = useRef(false);
  const canControlRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const lastSeekRef = useRef(0);

  const currentUserId = useMemo(() => getOrCreateUserId(), []);
  const myRole = room?.participants.find((participant) => participant.userId === me?.userId)?.role || me?.role;
  const canControl = myRole === 'Host' || myRole === 'Moderator';
  const isHost = myRole === 'Host';
  const shareLink = room ? `${window.location.origin}/room/${room.roomId}` : '';
  const currentVideoUrl = room?.videoId ? `https://www.youtube.com/watch?v=${room.videoId}` : DEFAULT_VIDEO_URL;

  useEffect(() => {
    canControlRef.current = canControl;
  }, [canControl]);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // Expose socket for debugging in the browser console
    try {
      window.__watchparty_socket = socket;
    } catch {}

    socket.on('connect', () => console.info('socket connected', socket.id));
    socket.on('connect_error', (err) => console.warn('socket connect_error', err && err.message));
    socket.on('reconnect_attempt', (n) => console.info('socket reconnect_attempt', n));
    socket.on('reconnect_failed', () => console.warn('socket reconnect_failed'));

    socket.on('sync_state', (state) => {
      console.info('[watchparty] received sync_state', state?.roomId, 'videoId=', state?.videoId);
      setRoom(state);
      if (state.chat) setChat(state.chat);
      applyRemoteState(state);
    });
    socket.on('user_joined', (payload) => updateParticipants(payload.participants));
    socket.on('user_left', (payload) => updateParticipants(payload.participants));
    socket.on('role_assigned', (payload) => updateParticipants(payload.participants));
    socket.on('participant_removed', (payload) => updateParticipants(payload.participants));
    socket.on('chat_message', (message) => setChat((items) => [...items, message].slice(-50)));
    socket.on('reaction', (reaction) => {
      if (reaction.userId === currentUserId) return;
      setReactions((items) => [...items, reaction].slice(-8));
      window.setTimeout(() => {
        setReactions((items) => items.filter((item) => item.id !== reaction.id));
      }, 3600);
    });
    socket.on('removed_from_room', () => {
      setRoom(null);
      setMe(null);
      setStatus('You were removed from the room by the host.');
    });
    socket.on('room_error', ({ message }) => setStatus(message));

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!room) {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
      playerRef.current = null;
      playerReadyRef.current = false;
      return;
    }

    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || playerRef.current) return;
      const playerElement = document.getElementById('youtube-player');
      if (!playerElement) return;
      const playerSize = getPlayerSize();

      playerRef.current = new window.YT.Player(playerElement, {
        height: playerSize.height,
        width: playerSize.width,
        videoId: room.videoId || DEFAULT_VIDEO_ID,
        playerVars: {
          enablejsapi: 1,
          modestbranding: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            console.info('[watchparty] YT player ready');
            playerReadyRef.current = true;
            resizePlayer();
            setPlayerNotice('');
            if (room) applyRemoteState(room);
          },
          onStateChange: (event) => handlePlayerState(event.data),
          onError: (event) => handlePlayerError(event.data)
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [room?.roomId]);

  useEffect(() => {
    if (!room) return undefined;
    const handleResize = () => resizePlayer();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [room?.roomId]);

  useEffect(() => {
    if (room) applyRemoteState(room);
  }, [room?.videoId, room?.playState, room?.currentTime]);

  function updateParticipants(participants) {
    setRoom((previous) => previous ? { ...previous, participants } : previous);
    setMe((previous) => participants.find((participant) => participant.userId === previous?.userId) || previous);
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!username.trim()) {
      setStatus('Enter your name first.');
      return;
    }

    const response = await fetch(`${SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, videoUrl })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.message || 'Could not create room.');
      return;
    }

    window.history.replaceState({}, '', `/room/${data.roomId}`);
    setRoomCode(data.roomId);
    joinRoom(data.roomId);
  }

  function joinRoom(code = roomCode) {
    if (!username.trim()) {
      setStatus('Enter your name first.');
      return;
    }
    if (!code.trim()) {
      setStatus('Enter a room code.');
      return;
    }

    const payload = {
      roomId: code.trim().toUpperCase(),
      username: username.trim(),
      userId: currentUserId
    };

    const emitJoin = () => {
      socketRef.current.emit('join_room', payload, (response) => {
        if (!response.ok) {
          setStatus(response.message || 'Could not join room.');
          return;
        }
        setMe(response.user || null);
        setRoom(response.state || null);
        setChat(response.state?.chat || []);
        setStatus(`Joined room ${payload.roomId}.`);
        window.history.replaceState({}, '', `/room/${payload.roomId}`);
      });
    };

    if (!socketRef.current) {
      setStatus('Connecting to server, please try again...');
      return;
    }

    if (!socketRef.current.connected) {
      setStatus('Waiting for connection...');
      socketRef.current.once('connect', emitJoin);
      return;
    }

    emitJoin();
  }

  function handlePlayerState(state) {
    if (applyingRemoteRef.current || !canControlRef.current || !window.YT || !playerRef.current || !playerReadyRef.current) return;

    const time = playerRef.current.getCurrentTime();
    if (state === window.YT.PlayerState.PLAYING) socketRef.current?.emit('play', { time });
    if (state === window.YT.PlayerState.PAUSED) socketRef.current?.emit('pause', { time });
  }

  function handlePlayerError(code) {
    const messages = {
      2: 'The video link is invalid. Paste a normal YouTube URL or 11-character video ID.',
      5: 'This video cannot play in the embedded YouTube player.',
      100: 'This video is unavailable or private.',
      101: 'The owner has disabled embedding for this video.',
      150: 'The owner has disabled embedding for this video.',
      153: 'YouTube blocked this video in embedded players.'
    };
    setPlayerNotice(messages[code] || 'YouTube could not load this video. Try another URL.');
  }

  function applyRemoteState(state) {
    const player = playerRef.current;
    console.info('[watchparty] applyRemoteState', { playerExists: !!player, playerReady: playerReadyRef.current, videoId: state?.videoId, playState: state?.playState, currentTime: state?.currentTime });
    if (!player || !playerReadyRef.current || typeof player.cueVideoById !== 'function') return;

    applyingRemoteRef.current = true;
    resizePlayer();
    const currentVideo = player.getVideoData?.().video_id;
    if (currentVideo !== state.videoId) {
      player.cueVideoById(state.videoId);
      setPlayerNotice('');
    }

    const playerTime = player.getCurrentTime?.() || 0;
    if (Math.abs(playerTime - state.currentTime) > 1.2) {
      player.seekTo(state.currentTime, true);
    }

    if (state.playState === 'playing') player.playVideo();
    if (state.playState === 'paused') player.pauseVideo();
    window.setTimeout(() => {
      applyingRemoteRef.current = false;
    }, 700);
  }

  function emitSeek() {
    if (!canControl || !playerRef.current) return;
    const now = Date.now();
    if (now - lastSeekRef.current < 800) return;
    lastSeekRef.current = now;
    socketRef.current?.emit('seek', { time: playerRef.current.getCurrentTime() });
  }

  function controlPlayback(action) {
    if (!playerRef.current) return;
    if (!canControl) {
      setStatus('Playback control is reserved for Host and Moderator only.');
      return;
    }
    const time = playerRef.current.getCurrentTime();
    socketRef.current?.emit(action, { time }, (response) => {
      if (!response.ok) setStatus(response.message || `Could not ${action} video.`);
    });
  }

  function syncCurrentTime() {
    if (!playerRef.current) return;
    if (!canControl) {
      setStatus('Playback control is reserved for Host and Moderator only.');
      return;
    }
    socketRef.current?.emit('seek', { time: playerRef.current.getCurrentTime() }, (response) => {
      if (!response.ok) setStatus(response.message || 'Could not sync current time.');
      else setStatus('Synced everyone to the current timestamp.');
    });
  }

  function changeVideo(event) {
    event.preventDefault();
    socketRef.current?.emit('change_video', { videoUrl: pendingVideo }, (response) => {
      if (!response.ok) setStatus(response.message || 'Could not change video.');
      else setPendingVideo('');
    });
  }

  function assignRole(userId, role) {
    socketRef.current?.emit('assign_role', { userId, role });
  }

  function transferHostTo(userId) {
    socketRef.current?.emit('transfer_host', { userId });
  }

  function removeParticipant(userId) {
    socketRef.current?.emit('remove_participant', { userId });
  }

  function leaveRoom() {
    socketRef.current?.emit('leave_room', { roomId: room?.roomId });
    setRoom(null);
    setMe(null);
    setChat([]);
    setReactions([]);
    setStatus('You left the room. Create or join another room.');
    window.history.replaceState({}, '', '/');
  }

  function sendChat(event) {
    event.preventDefault();
    if (!chatText.trim()) return;
    socketRef.current?.emit('chat_message', { text: chatText });
    setChatText('');
  }

  function sendReaction(label) {
    if (!socketRef.current) return;
    socketRef.current.emit('reaction', { label }, (response) => {
      if (response?.ok) {
        const burst = 6;
        for (let i = 0; i < burst; i++) {
          const local = {
            id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`,
            label,
            userId: currentUserId,
            username: (me && me.username) || 'You'
          };
          setReactions((items) => [...items, local].slice(-10));
          setTimeout(() => {
            setReactions((items) => items.filter((r) => r.id !== local.id));
          }, 3600 + i * 60);
        }
      } else {
        console.warn('Reaction was rejected by server', response);
      }
    });
  }

  return (
    <main className="app-shell workspace-shell">
      <section className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><Play size={22} fill="currentColor" /></span>
          <div>
            <p className="eyebrow">MERN + Socket.IO</p>
            <h1>YouTube Watch Party</h1>
          </div>
        </div>
        {room && (
          <>
            <button className="ghost-button" onClick={() => navigator.clipboard.writeText(shareLink)} title="Copy room link">
              <Copy size={18} />
              Copy link
            </button>
            <button className="ghost-button" onClick={leaveRoom} title="Leave room">
              Leave room
            </button>
          </>
        )}
      </section>

      {!room && (
        <section className="entry-grid entry-grid-with-preview">
          <form className="panel" onSubmit={createRoom}>
            <div className="panel-heading">
              <span className="panel-icon"><Video size={22} /></span>
              <h2>Create room</h2>
            </div>
            <label>
              Your name
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Host name" />
            </label>
            <label>
              YouTube URL or ID
              <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </label>
            <button type="submit">
              <Crown size={18} />
              Create as host
            </button>
          </form>

          <form className="panel" onSubmit={(event) => { event.preventDefault(); joinRoom(); }}>
            <div className="panel-heading">
              <span className="panel-icon"><LogIn size={22} /></span>
              <h2>Join room</h2>
            </div>
            <label>
              Your name
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Participant name" />
            </label>
            <label>
              Room code
              <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ABC12345" />
            </label>
            <button type="submit">
              <Users size={18} />
              Join party
            </button>
          </form>

          <aside className="preview-panel" aria-label="Room preview">
            <div className="preview-player">
              <span><Play size={26} fill="currentColor" /></span>
            </div>
            <div className="preview-stack">
              <span className="mini-chip">Host</span>
              <span className="mini-chip muted">Moderator</span>
              <span className="mini-chip muted">Participant</span>
            </div>
          </aside>
        </section>
      )}

      {room && (
        <section className="room-layout">
          <div className="watch-zone">
            <div className="room-meta room-meta-card">
              <div>
                <p className="eyebrow">Room {room.roomId}</p>
                <h2>{isHost ? 'Host controls' : myRole === 'Moderator' ? 'Moderator controls' : 'Viewer controls'}</h2>
              </div>
              <div className="room-pills">
                <span className={canControl ? 'badge allow' : 'badge deny'}>
                  {canControl ? 'Playback enabled' : 'Watch only'}
                </span>
                <span className="badge neutral"><Users size={14} /> {room.participants.length}</span>
              </div>
              {!canControl && (
                <div className="watch-only-alert">
                  Watch-only mode. The host controls playback.
                </div>
              )}
            </div>

            <div className="player-frame" onMouseUp={emitSeek} onTouchEnd={emitSeek}>
              <div id="youtube-player" />
              {!canControl && <div className="player-blocker" aria-hidden="true" />}
              {playerNotice && (
                <div className="player-notice">
                  <strong>{playerNotice}</strong>
                  <a href={currentVideoUrl} target="_blank" rel="noreferrer">Open on YouTube</a>
                </div>
              )}
              <div className="reaction-stack" aria-live="polite">
                {reactions.map((reaction) => (
                  <span key={reaction.id} title={`Reaction by ${reaction.username || 'someone'}`}>
                    <span className="reaction-emoji">{REACTION_EMOJI[reaction.label] || reaction.label}</span>
                    <small>{reaction.username || 'Someone'}</small>
                  </span>
                ))}
              </div>
            </div>

            <div className="control-strip">
              <button className="primary-control" disabled={!canControl} onClick={() => controlPlayback('play')} type="button">
                <Play size={18} />
                Play
              </button>
              <button className="primary-control" disabled={!canControl} onClick={() => controlPlayback('pause')} type="button">
                <Pause size={18} />
                Pause
              </button>
              <button className="primary-control" disabled={!canControl} onClick={syncCurrentTime} type="button">
                <RotateCcw size={18} />
                Sync time
              </button>
            </div>

            <form className="inline-form" onSubmit={changeVideo}>
              <input
                value={pendingVideo}
                onChange={(event) => setPendingVideo(event.target.value)}
                placeholder={canControl ? 'Paste YouTube URL to change video' : 'Only Host or Moderator can change video'}
                disabled={!canControl}
              />
              <button disabled={!canControl} type="submit">
                <Play size={18} />
                Load
              </button>
            </form>

            <div className="reaction-bar" aria-label="Room reactions">
              <span><SmilePlus size={18} /> React</span>
              {REACTIONS.map((label) => (
                <button className="pill-button" type="button" key={label} onClick={() => sendReaction(label)}>
                  {REACTION_EMOJI[label] || label}
                </button>
              ))}
            </div>
          </div>

          <aside className="side-panel">
            <div className="panel-section">
              <div className="section-heading">
                <h3><Users size={18} /> Participants</h3>
                <span>{room.participants.length} online</span>
              </div>
              <div className="participant-list">
                {room.participants.map((participant) => (
                  <div className="participant-row" key={participant.userId}>
                    <div className="participant-main">
                      <span className="avatar">{participant.username.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{participant.username}</strong>
                        <span>{participant.role}</span>
                      </div>
                    </div>
                    {isHost && participant.userId !== me?.userId && (
                      <div className="row-actions">
                        <select value={participant.role} onChange={(event) => assignRole(participant.userId, event.target.value)}>
                          <option>Participant</option>
                          <option>Moderator</option>
                          <option>Viewer</option>
                          <option>Host</option>
                        </select>
                        <button className="icon-button" onClick={() => transferHostTo(participant.userId)} title="Transfer host">
                          <Crown size={16} />
                          <span style={{ marginLeft: '6px' }}>Host</span>
                        </button>
                        <button className="icon-button danger" onClick={() => removeParticipant(participant.userId)} title="Remove participant">
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-section chat-section">
              <div className="section-heading">
                <h3><MessageCircle size={18} /> Chat</h3>
                <span><Sparkles size={14} /> live</span>
              </div>
              <div className="chat-log">
                {chat.length === 0 ? (
                  <div className="empty-chat">No messages yet.</div>
                ) : (
                  chat.map((message) => (
                    <div key={message.id} className="chat-message">
                      <span>{message.username} - {message.role}</span>
                      <p>{message.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form className="chat-form" onSubmit={sendChat}>
                <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message the room" />
                <button type="submit">Send</button>
              </form>
            </div>
          </aside>
        </section>
      )}

      <footer>
        <Shield size={16} />
        {status}
      </footer>
    </main>
  );
}

function App() {
  const theme = useSelector((state) => state.ui.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<WatchPartyPage />} />
      <Route path="/room/:roomId" element={<WatchPartyPage />} />
      <Route path="*" element={<ProductShell compact><ErrorPage /></ProductShell>} />
    </Routes>
  );
}

function ProductShell({ children, compact = false }) {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);
  const nav = [
    ['/', 'Rooms']
  ];

  return (
    <main className={`product-shell ${compact ? 'compact-shell' : ''}`}>
      <aside className="product-sidebar">
        <Link to="/" className="sidebar-brand">
          <span><Play size={18} fill="currentColor" /></span>
          WatchParty
        </Link>
        <nav>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="product-main">
        <header className="product-topbar">
          <div>
            <p className="eyebrow">Production workspace</p>
            <h1>Watch together, stay perfectly synced.</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function ErrorPage() {
  return (
    <section className="error-card">
      <h2>Page not found</h2>
      <p>The route you opened does not exist.</p>
      <Link to="/">Go home</Link>
    </section>
  );
}

function getOrCreateUserId() {
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(USER_ID_KEY, id);
  return id;
}

function getRoomFromPath() {
  const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/);
  return match?.[1]?.toUpperCase() || '';
}

function getServerUrl() {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  // When running with Vite (ports 5173/5174 etc.) talk to local server on 5000
  if (window.location.hostname === 'localhost' && String(window.location.port).startsWith('517')) {
    return 'http://localhost:5000';
  }
  return window.location.origin;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  });
}

function getPlayerSize() {
  const frame = document.querySelector('.player-frame');
  const rect = frame?.getBoundingClientRect();
  return {
    width: Math.max(320, Math.round(rect?.width || 960)),
    height: Math.max(180, Math.round(rect?.height || 540))
  };
}

function resizePlayer() {
  const iframe = document.querySelector('iframe#youtube-player');
  const rect = document.querySelector('.player-frame')?.getBoundingClientRect();
  if (!iframe || !rect) return;
  iframe.width = String(Math.max(320, Math.round(rect.width)));
  iframe.height = String(Math.max(180, Math.round(rect.height)));
}

export default App;
