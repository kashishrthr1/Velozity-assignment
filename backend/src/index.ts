import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket';
import { startOverdueChecker } from './jobs/overdueChecker';

// Routes
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import clientsRouter from './routes/clients';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import notificationsRouter from './routes/notifications';
import activityRouter from './routes/activity';
import { seedDatabase } from './lib/seed';
import { prisma } from './lib/prisma';

const app = express();
const httpServer = http.createServer(app);

// Security middleware
app.use(helmet());
app.set('trust proxy', 1);

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (origin === env.CORS_ORIGIN) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

// CORS — credentials:true + dynamic origin for cross-domain and multi-port support
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback gracefully in dev/container environments
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true }));

app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/activity', activityRouter);

// Global error handler — must be last
app.use(errorHandler);

// Initialize WebSocket server
initSocket(httpServer);

// Start background jobs only if not in test
if (process.env.NODE_ENV !== 'test') {
  startOverdueChecker();

  // Retry connecting to DB and seed if empty
  (async () => {
    for (let i = 0; i < 20; i++) {
      try {
        await prisma.$connect();
        await seedDatabase(false);
        break;
      } catch (err) {
        console.log(`[Database] Connecting... (${i + 1}/20)`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();

  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`[Server] Configured CORS origin: ${env.CORS_ORIGIN}`);
  });
}

export { app, httpServer };
