import { Server, Socket } from 'socket.io';
import { pool } from '../../db';
import { normalizeRole } from '../../utils/roleUtils';

const activeLocations: Record<string, any> = {};

export function getActiveLocations() {
  return activeLocations;
}

export function startLocationExpiryTask() {
  setInterval(() => {
    const now = Date.now();
    for (const userId in activeLocations) {
      if (now - new Date(activeLocations[userId].timestamp).getTime() > 60000) {
        delete activeLocations[userId];
      }
    }
  }, 60000);
}

export function setupLocationHandlers(io: Server, socket: Socket) {
  socket.on('location_update', async (data: any) => {
    const role = normalizeRole(data.role);
    if (!['tanod', 'responder', 'resident'].includes(role)) return;

    const locationEntry = {
      userId: data.userId,
      role,
      lat: data.latitude,
      lng: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
      timestamp: data.timestamp || new Date().toISOString(),
      alertId: data.alertId || null,
    };

    activeLocations[data.userId] = locationEntry;

    // Write to history table on every update
    try {
      await pool.query(
        `INSERT INTO location_history 
         (user_id, role, location, accuracy, speed, heading, alert_id, recorded_at)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, NOW())`,
        [data.userId, role, data.longitude, data.latitude, data.accuracy, data.speed, data.heading, data.alertId || null]
      );
    } catch (err) {
      console.error('[location.handler] Failed to write location_history:', err);
    }

    io.to('responders').emit('location_update_delta', locationEntry);

    if (data.alertId) {
      io.to(`sos:${data.alertId}`).emit('sos_location_stream', locationEntry);
    }
  });

  socket.on('join_sos_room', (alertId: string) => {
    socket.join(`sos:${alertId}`);
  });

  socket.on('leave_sos_room', (alertId: string) => {
    socket.leave(`sos:${alertId}`);
  });
}
