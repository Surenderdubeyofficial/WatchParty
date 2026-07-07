import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from '../config/env.js';

export function securityMiddleware(app) {
  const allowedOrigins = new Set([env.clientUrl, 'http://localhost:5173', `http://localhost:${env.port}`]);
  // Allow common Vite dev ports for local development (5173-5179) and 127.0.0.1 variants
  for (let p = 5173; p <= 5179; p++) {
    allowedOrigins.add(`http://localhost:${p}`);
    allowedOrigins.add(`http://127.0.0.1:${p}`);
  }

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  }));
  // Guard mongo-sanitize against Express 5 getter-only request properties
  const _mongoSanitize = mongoSanitize();
  app.use((req, res, next) => {
    try {
      return _mongoSanitize(req, res, next);
    } catch (err) {
      // If sanitizer fails (some versions attempt to set getter-only properties), skip sanitization
      return next();
    }
  });
  app.use(hpp());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  return allowedOrigins;
}
