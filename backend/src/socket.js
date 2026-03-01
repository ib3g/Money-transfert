import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (env.isDev) return callback(null, true);

        const allowedOrigins = process.env.FRONTEND_URL
          ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
          : [];

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const payload = jwt.verify(token, env.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true, currentSessionId: true, zones: { select: { zoneId: true } } },
      });

      if (!user || !user.isActive) return next(new Error('Unauthorized'));
      if (user.currentSessionId && payload.sessionId !== user.currentSessionId) {
        return next(new Error('Session replaced'));
      }

      socket.userId = user.id;
      socket.userZones = user.zones.map((z) => z.zoneId);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Join zone rooms
    socket.userZones?.forEach((zoneId) => {
      socket.join(`zone:${zoneId}`);
    });

    socket.on('notification:read', ({ notificationId }) => {
      prisma.notification.update({
        where: { id: notificationId, userId: socket.userId },
        data: { isRead: true, readAt: new Date() },
      }).catch(() => { });
    });

    socket.on('disconnect', () => {
      // Socket.io cleans up rooms automatically
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToUser(userId, event, data) {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToZone(zoneId, event, data) {
  getIO().to(`zone:${zoneId}`).emit(event, data);
}
