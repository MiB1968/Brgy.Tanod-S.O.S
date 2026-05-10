import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../types';
import { SOCKET_EVENTS } from '../../constants';
import { incidentService } from '../../services/incidentService';

let io: Server;

export const setupIncidentHandlers = (socketIO: Server, socket: AuthenticatedSocket) => {
  io = socketIO;

  // Citizen sends SOS
  socket.on('create_sos', async (data: {
    description: string;
    latitude: number;
    longitude: number;
    initialType?: string;
    photos?: string[];           // base64 or URLs
    voiceClip?: string;
  }) => {
    const user = socket.data.user;

    try {
      const incident = await incidentService.createSOS({
        reporterId: user.id,
        barangayId: user.barangayId || 'default',
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        initialType: data.initialType,
        photos: data.photos,
        voiceClip: data.voiceClip
      });

      // Send back to reporter with tracking info
      socket.emit(SOCKET_EVENTS.SOS_ALERT, {
        success: true,
        incidentId: incident.id,
        aiAnalysis: incident.aiAnalysis
      });

      console.log(`[Socket] SOS Created by ${user.role} ${user.id} | Type: ${incident.aiAnalysis?.incidentType}`);

    } catch (error: any) {
      console.error('[Socket] create_sos failed:', error);
      
      const errorMessage = error?.message || 'Failed to process emergency report';
      socket.emit('sos_error', {
        success: false,
        error: errorMessage
      });
    }
  });

  // Tanod / Admin actions
  socket.on('respond_to_incident', (data: { incidentId: string }) => {
    const user = socket.data.user;
    io.to('responders').emit(SOCKET_EVENTS.INCIDENT_ASSIGNED, {
      incidentId: data.incidentId,
      responderId: user.id,
      responderName: user.name
    });
  });

  socket.on('join_incident_room', (incidentId: string) => {
    socket.join(`incident_${incidentId}`);
  });
};

// Helper to emit updates from services
export const broadcastIncidentUpdate = (incidentId: string, update: any) => {
  if (io) {
    io.to(`incident_${incidentId}`).emit(SOCKET_EVENTS.INCIDENT_UPDATED, update);
  }
};

