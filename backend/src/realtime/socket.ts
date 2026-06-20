import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { startPriceFeed } from './priceFeed';

export function initSocket(server: http.Server) {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim());
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed'));
        }
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow anonymous market subscription
    try { (socket.data as any).user = jwt.verify(token, env.JWT_ACCESS_SECRET); } catch {}
    next();
  });

  io.on('connection', (socket) => {
    socket.on('subscribe:market', () => socket.join('market'));
    const u = (socket.data as any).user;
    if (u?.sub) socket.join(`user:${u.sub}`); // private channel for notifications
  });

  startPriceFeed(io, 1000);
  return io;
}
