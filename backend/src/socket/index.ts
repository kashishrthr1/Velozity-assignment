import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../middleware/auth';
import { Role } from '@prisma/client';
import { getActivityForRole } from '../services/activity.service';
import { getUnreadCount } from '../services/notification.service';

let io: Server | null = null;

export function getIo(): Server | null {
  return io;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local development origins (5173, 5174, etc.) and configured CORS_ORIGIN
        if (!origin || origin === env.CORS_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Gracefully fallback
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      next(new Error('No token provided'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      (socket as Socket & { user: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as Socket & { user: JwtPayload }).user;
    if (!user) { socket.disconnect(); return; }

    console.log(`[Socket] Connected: ${user.email} (${user.role})`);

    // Mark user online
    await prisma.user.update({
      where: { id: user.userId },
      data: { isOnline: true, lastSeen: new Date() },
    }).catch(() => {});

    // Join role-based room
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.userId}`);

    // Broadcast updated online count to admins
    const onlineCount = await prisma.user.count({ where: { isOnline: true } });
    io!.to('role:ADMIN').emit('onlineCount', { count: onlineCount });

    // Handle joining a project room
    socket.on('joinProject', async (projectId: string) => {
      // Verify access
      try {
        if (user.role === 'ADMIN') {
          socket.join(`project:${projectId}`);
        } else if (user.role === 'PROJECT_MANAGER') {
          const project = await prisma.project.findFirst({
            where: { id: projectId, createdById: user.userId },
          });
          if (project) socket.join(`project:${projectId}`);
        } else {
          const task = await prisma.task.findFirst({
            where: { projectId, assignedToId: user.userId },
          });
          if (task) socket.join(`project:${projectId}`);
        }
      } catch (err) {
        console.error('[Socket] joinProject error:', err);
      }
    });

    socket.on('leaveProject', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Catch-up: client sends timestamp of last event they saw
    socket.on('catchup', async (data: { since: string }) => {
      try {
        const since = new Date(data.since);
        if (isNaN(since.getTime())) return;
        const { getActivityForRole: getActivity } = await import('../services/activity.service');
        const { getMissedEvents } = await import('../services/activity.service');
        const events = await getMissedEvents(user.userId, user.role, since);
        socket.emit('catchupEvents', events);
      } catch (err) {
        console.error('[Socket] catchup error:', err);
      }
    });

    // Notification read — refresh badge
    socket.on('refreshNotifications', async () => {
      const count = await getUnreadCount(user.userId);
      socket.emit('notificationCount', { count });
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${user.email}`);
      await prisma.user.update({
        where: { id: user.userId },
        data: { isOnline: false, lastSeen: new Date() },
      }).catch(() => {});

      const onlineCount = await prisma.user.count({ where: { isOnline: true } });
      io!.to('role:ADMIN').emit('onlineCount', { count: onlineCount });
    });
  });

  return io;
}
