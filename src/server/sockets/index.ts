import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';

interface LocationEntry {
  user_id: string;
  role: string;
  lat: number;
  lng: number;
  name?: string;
  timestamp?: string;
}

const activeLocations: Record<string, LocationEntry> = {};

export function getActiveLocations(): LocationEntry[] {
  return Object.values(activeLocations);
}

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: config.corsOrigin }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      // Allow unauthenticated for now if needed, but better to enforce
      return next(); 
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const socketId = socket.id;
    console.log(`Socket connected: ${socketId} (User: ${user?.email || 'Anonymous'})`);

    if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'tanod') {
      socket.join('responders');
    }

    // Location Tracking
    socket.on('location_update', (data: LocationEntry) => {
      if (!data.user_id || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
      
      activeLocations[data.user_id] = {
        ...data,
        timestamp: new Date().toISOString()
      };

      // Broadcast location map to responders only, reducing global bandwidth
      io.to('responders').emit('location_map', activeLocations);
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socketId} (Reason: ${reason})`);
      // Optional: We can leave location stale or remove it. For now, leave it to keep last known location.
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

export function emitToAll(event: string, data: any) {
  if (io) io.emit(event, data);
}

export function emitToResponders(event: string, data: any) {
  if (io) io.to('responders').emit(event, data);
}
