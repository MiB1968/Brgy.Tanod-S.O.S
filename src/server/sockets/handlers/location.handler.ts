import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../types';
import { isTanodOrAbove } from '../../utils/roleUtils';

interface LocationEntry {
  user_id: string;
  role: string;
  lat: number;
  lng: number;
  name?: string;
  timestamp?: string;
  status?: string;
}

const activeLocations: Record<string, LocationEntry> = {};
let batchedUpdates: LocationEntry[] = [];

export function getActiveLocations(): LocationEntry[] {
  return Object.values(activeLocations);
}

export function setupLocationHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  // Only tanod-tier and above receive the initial full location map
  if (isTanodOrAbove(user.role)) {
    socket.emit('location_map', activeLocations);
  }

  socket.on('location_update', (data: LocationEntry) => {
    if (!data.user_id || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

    const newEntry: LocationEntry = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    activeLocations[data.user_id] = newEntry;

    // Queue update for batch broadcast instead of emitting immediately
    batchedUpdates.push(newEntry);
  });

  socket.on('disconnect', () => {
    if (user && user.id) {
      delete activeLocations[user.id];
      io.to('responders').emit('location_remove_delta', { user_id: user.id });
    }
  });
}

export function startLocationBatchingTask(io: Server) {
  // Broadcast batched location updates every 2 seconds to reduce network overhead
  setInterval(() => {
    if (batchedUpdates.length > 0) {
      // Send the batch to the responders room
      io.to('responders').emit('location_update_batch', batchedUpdates);
      // Clear the batch
      batchedUpdates = [];
    }
  }, 2000);
}

export function startLocationExpiryTask(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const expiryMs = 5 * 60 * 1000; // 5 minutes

    Object.keys(activeLocations).forEach((userId) => {
      const loc = activeLocations[userId];
      if (loc.timestamp) {
        const age = now - new Date(loc.timestamp).getTime();
        if (age > expiryMs) {
          delete activeLocations[userId];
          io.to('responders').emit('location_remove_delta', { user_id: userId });
        }
      }
    });
  }, 60000);
}
