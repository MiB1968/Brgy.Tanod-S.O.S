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
const pendingDeltas: Record<string, LocationEntry> = {};
let batchInterval: NodeJS.Timeout | null = null;

export function getActiveLocations(): LocationEntry[] {
  return Object.values(activeLocations);
}

export function setupLocationHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  // Only tanod-tier and above receive the initial full location map
  if (isTanodOrAbove(user.role)) {
    socket.emit('location_map', activeLocations);
  }

  // Start the batching interval if not already running
  if (!batchInterval) {
    batchInterval = setInterval(() => {
      const deltas = Object.values(pendingDeltas);
      if (deltas.length > 0) {
        io.to('responders').emit('location_update_batch', deltas);
        // Clear the batch
        for (const key in pendingDeltas) {
          delete pendingDeltas[key];
        }
      }
    }, 1000);
  }

  socket.on('location_update', (data: LocationEntry) => {
    if (!data.user_id || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

    const newEntry: LocationEntry = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    activeLocations[data.user_id] = newEntry;

    // Queue delta for batching
    pendingDeltas[data.user_id] = newEntry;
  });

  socket.on('disconnect', () => {
    if (user && user.id) {
      delete activeLocations[user.id];
      delete pendingDeltas[user.id];
      io.to('responders').emit('location_remove_delta', { user_id: user.id });
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
        const age = now - new Date(loc.timestamp).getTime();
        if (age > expiryMs) {
          delete activeLocations[userId];
          io.to('responders').emit('location_remove_delta', { user_id: userId });
        }
      }
    });
  }, 60000);
}
