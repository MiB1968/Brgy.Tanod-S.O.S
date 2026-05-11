import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../types';
import { SOCKET_EVENTS } from '../../constants';
import { incidentService } from '../../services/incidentService';
import { z } from 'zod';

let io: Server;

// Zod schemas for strict payload validation
const createSosSchema = z.object({
  description: z.string().optional().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  initialType: z.string().optional(),
  photos: z.array(z.string()).optional(),
  voiceClip: z.string().optional(),
  clientUuid: z.string().uuid().optional(),
});

const respondIncidentSchema = z.object({
  incidentId: z.string().min(1),
});

export const setupIncidentHandlers = (socketIO: Server, socket: AuthenticatedSocket) => {
  io = socketIO;

  // Citizen sends SOS
  socket.on('create_sos', async (rawData: unknown) => {
    const user = socket.data.user;

    try {
      // 1. Strict Payload Validation
      const data = createSosSchema.parse(rawData);

      const incident = await incidentService.createSOS({
        reporterId: user.id,
        barangayId: user.barangayId || 'default',
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        initialType: data.initialType,
        photos: data.photos,
        voiceClip: data.voiceClip,
        clientUuid: data.clientUuid,
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
  socket.on('respond_to_incident', (rawData: unknown) => {
    const user = socket.data.user;
    try {
      const data = respondIncidentSchema.parse(rawData);
      io.to('responders').emit(SOCKET_EVENTS.INCIDENT_ASSIGNED, {
        incidentId: data.incidentId,
        responderId: user.id,
        responderName: user.name
      });
    } catch (error) {
       console.error('[Socket] respond_to_incident validation failed:', error);
    }
  });

  socket.on('join_incident_room', (incidentId: unknown) => {
    if (typeof incidentId === 'string' && incidentId.length > 0) {
      socket.join(`incident_${incidentId}`);
    }
  });
};

// Helper to emit updates from services
export const broadcastIncidentUpdate = (incidentId: string, update: any) => {
  if (io) {
    io.to(`incident_${incidentId}`).emit(SOCKET_EVENTS.INCIDENT_UPDATED, update);
  }
};


