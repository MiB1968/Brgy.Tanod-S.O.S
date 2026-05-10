import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../../types';

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

export function setupLocationHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  if (user.role === 'ADMIN' || user.role === 'CAPTAIN' || user.role === 'TANOD' || (user.role as string) === 'admin' || (user.role as string) === 'superadmin' || (user.role as string) === 'tanod') {
    socket.emit('location_map', activeLocations);
  }

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
}

export function startLocationExpiryTask(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const expiryMs = 5 * 60 * 1000; // 5 minutes

    Object.keys(activeLocations).forEach((userId) => {
      const loc = activeLocations[userId];
      if (loc.timestamp) {
        const timeDiff = now - new Date(loc.timestamp).getTime();
        if (timeDiff > expiryMs) {
          delete activeLocations[userId];
          if (io) io.to('responders').emit('location_remove_delta', { user_id: userId });
        }
      }
    });
  }, 60000);
}
