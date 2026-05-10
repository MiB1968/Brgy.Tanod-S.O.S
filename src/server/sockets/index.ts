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
      // Send initial full map to newly connected responder
      socket.emit('location_map', activeLocations);
    }

    // Location Tracking
    socket.on('location_update', (data: LocationEntry) => {
      if (!data.user_id || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
      
      const newEntry = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      activeLocations[data.user_id] = newEntry;

      // Broadcast DELTA location map to responders only
      io.to('responders').emit('location_update_delta', newEntry);
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socketId} (Reason: ${reason})`);
    });
  });

  // Stale Location Expiry Task (runs every 1 minute)
  setInterval(() => {
    const now = Date.now();
    const expiryMs = 5 * 60 * 1000; // 5 minutes

    Object.keys(activeLocations).forEach((userId) => {
      const loc = activeLocations[userId];
      if (loc.timestamp) {
        const timeDiff = now - new Date(loc.timestamp).getTime();
        if (timeDiff > expiryMs) {
          delete activeLocations[userId];
          // Broadcast delta indicating removal
          if (io) io.to('responders').emit('location_remove_delta', { user_id: userId });
        }
      }
    });
  }, 60000);

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
