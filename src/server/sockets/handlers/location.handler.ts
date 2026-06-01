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
  is_outside_barangay?: boolean;
}

const activeLocations: Record<string, LocationEntry> = {};

export function getActiveLocations(): LocationEntry[] {
  return Object.values(activeLocations);
}

export function setupLocationHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  // Only tanod-tier and above receive the initial full location map
  if (isTanodOrAbove(user.role)) {
    socket.emit('location_map', activeLocations);
  }

  socket.on('location_update', async (data: LocationEntry) => {
    if (!data.user_id || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

    // Perform geofence boundary validation asynchronously
    let isOutside = false;
    try {
      const { checkAndUpdateGeofence } = await import('../../services/geofencingService');
      
      // Update residents table is_outside_barangay value when citizen roles update
      if (data.role?.toLowerCase() === 'resident') {
        const result = await checkAndUpdateGeofence(data.user_id, data.lat, data.lng);
        if (result !== undefined) {
          isOutside = result.is_outside_barangay;
        }
      }
    } catch (geofenceErr: any) {
      console.warn(`[LocationHandler] Geofence warning for user ${data.user_id}:`, geofenceErr.message);
    }

    const newEntry: LocationEntry = {
      ...data,
      timestamp: new Date().toISOString(),
      is_outside_barangay: isOutside,
    };

    activeLocations[data.user_id] = newEntry;

    // Broadcast delta to responders room only
    io.to('responders').emit('location_update_delta', newEntry);
  });

  socket.on('disconnect', () => {
    if (user && user.id) {
      delete activeLocations[user.id];
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
