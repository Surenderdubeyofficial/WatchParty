import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { securityMiddleware } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { RoomStore } from './services/RoomStore.js';
import { MessageHandler } from './services/MessageHandler.js';
import { authRouter } from './routes/authRoutes.js';
import { roomRouter } from './routes/roomRoutes.js';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { profileRouter } from './routes/profileRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const allowedOrigins = securityMiddleware(app);
const roomStore = new RoomStore();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1,
    rooms: roomStore.count(),
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomRouter(roomStore));
app.use('/api/dashboard', dashboardRouter(roomStore));
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter(roomStore));
app.use(notFound);

app.use(express.static(clientDist));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

const httpServer = createServer(app);
// Prevent unhandled 'error' events (for example EADDRINUSE during rapid restarts)
httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} already in use. Exiting.`);
    process.exit(1);
  }
  console.error('HTTP server error:', err);
});
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 25000,
  pingTimeout: 20000
});

new MessageHandler(io, roomStore).register();

connectMongo().finally(() => {
  httpServer.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
});
