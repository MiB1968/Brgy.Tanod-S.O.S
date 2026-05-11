import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../../types';
import { z } from 'zod';

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

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export function setupLocationHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  if (user.role === 'ADMIN' || user.role === 'CAPTAIN' || user.role === 'TANOD' || (user.role as string) === 'admin' || (user.role as string) === 'superadmin' || (user.role as string) === 'tanod') {
    socket.emit('location_map', activeLocations);
  }

  socket.on('location_update', (rawData: unknown) => {
    try {
      const data = locationUpdateSchema.parse(rawData);
      
      const newEntry: LocationEntry = {
        // Enforce identity via socket session, prevent spoofing
        user_id: user.id,
        role: user.role,
        name: user.name,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      };
      
      activeLocations[user.id] = newEntry;

      // Broadcast DELTA location map to responders only
      io.to('responders').emit('location_update_delta', newEntry);
    } catch (e) {
      console.warn(`[Socket] location_update rejected for ${user.id} due to invalid payload`);
    }
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
  }, 60000); // 1 minute checks
}

