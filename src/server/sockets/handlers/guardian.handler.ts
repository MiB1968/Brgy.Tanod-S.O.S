import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../types';
import { incidentService } from '../../services/incidentService';
import { getActiveLocations } from './location.handler';

export function setupGuardianHandler(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  // 1. Priority Spike (Deterministic Emergency from AI/Regex)
  socket.on('guardian:priority_spike', async (data: { type: string; level: string; transcript: string }) => {
    try {
      console.log(`[GUARDIAN] Priority spike from ${user.id}: ${data.type} (${data.level})`);

      // Find user's last known location
      const locations = getActiveLocations();
      const userLoc = locations.find(l => l.user_id === user.id);

      // Default to barangay center if location unknown (better to report than skip)
      const lat = userLoc?.lat || 14.5995;
      const lng = userLoc?.lng || 120.9842;

      const incident = await incidentService.createSOS({
        reporterId: user.id,
        barangayId: user.barangayId || 'default',
        description: `[AI GUARDIAN AUTOMATIC ALERT] ${data.transcript}`,
        latitude: lat,
        longitude: lng,
        initialType: data.type,
      });

      // Feedback to the user
      socket.emit('guardian:ack', { 
        status: 'EMERGENCY_REPORTED', 
        incidentId: incident.id 
      });

    } catch (err: any) {
      if (err.code === "RATE_LIMITED" || err.message?.includes("System busy")) {
        console.warn(`[GUARDIAN] Spike rate limited gracefully for user ${user.id}: ${err.message}`);
      } else {
        console.error('[GUARDIAN] Spike processing failed:', err);
      }
    }
  });

  // 2. Live Transcript (For dispatch awareness)
  socket.on('guardian:live_transcript', (data: { transcript: string; isFinal: boolean }) => {
    // Broadcast to responders in the same barangay so they can "listen in"
    io.to('responders').to(`barangay_${user.barangayId}`).emit('guardian:monitor_transcript', {
      userId: user.id,
      userName: user.name,
      transcript: data.transcript,
      isFinal: data.isFinal,
      timestamp: new Date()
    });
  });

  // 3. Heartbeat/Status
  socket.on('guardian:status_update', (status: string) => {
    // Could track state in Redis/DB for broader monitoring
    console.log(`[GUARDIAN] User ${user.id} status: ${status}`);
  });
}
