import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { socketAuthMiddleware } from '../middleware/socketAuth';
import { setupLocationHandlers, startLocationExpiryTask, getActiveLocations } from './handlers/location.handler';
import { setupIncidentHandlers } from './handlers/incident.handler';
import { config } from '../config/index';

let io: Server;

export { getActiveLocations };

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    pingTimeout: 60000,      // 60 seconds
    pingInterval: 25000,     // 25 seconds
    transports: ['websocket', 'polling'],
  });

  // Global Socket Authentication
  io.use(socketAuthMiddleware as any);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const { id, role, barangayId } = socket.data.user;

    console.log(`[Socket] Connected → ${role} ${id} | Barangay: ${barangayId}`);

    // Universal User Room
    socket.join(`user_${id}`);

    // Role-based room joining
    if (role === 'TANOD' || role === 'ADMIN' || role === 'CAPTAIN' || (role as string) === 'admin' || (role as string) === 'superadmin' || (role as string) === 'tanod') {
      socket.join('responders');
      socket.join(`barangay_${barangayId}`);
      if (role === 'ADMIN' || (role as string) === 'admin' || role === 'CAPTAIN') {
         socket.join(`admin_${id}`);
      }
    } else {
      socket.join(`citizen_${id}`);
      socket.join(`barangay_${barangayId}`);
    }

    // Register feature handlers
    setupLocationHandlers(io, socket);
    setupIncidentHandlers(io, socket);

    // Voice Assistant Events
    socket.on('voice-command', async (data) => {
      try {
        const { voiceAssistantService } = await import('../services/voiceAssistantService');
        await voiceAssistantService.processVoiceInput(id, data.transcript, role as string);
        // Response already emitted inside service
      } catch (error: any) {
        socket.emit('voice-error', { 
          message: error.message,
          code: error.code || 'VOICE_PERMISSION_ERROR'
        });
      }
    });

    socket.on('confirm-action', async (data) => {
      try {
        const { voiceAssistantService } = await import('../services/voiceAssistantService');
        // socket.io buffers arrive directly as Node Buffers
        const audioBuffer = data.voiceSample ? Buffer.from(data.voiceSample) : undefined;
        await voiceAssistantService.executeConfirmedAction(id, data.action, role as string, audioBuffer);
      } catch (e: any) {
        console.error(e);
        socket.emit('voice-error', { 
           message: e.message,
           code: e.code || 'ACTION_FAILED'
        });
      }
    });

    // Heartbeat
    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected → ${role} ${id} | Reason: ${reason}`);
      // Cleanup can be handled in individual handlers
    });
  });

  // Start background tasks
  startLocationExpiryTask(io);

  console.log('[Socket] Socket.IO initialized successfully');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToAll(event: string, data: any) {
  if (io) io.emit(event, data);
}

// Helper emitters
export function emitToResponders(event: string, data: any) {
  io?.to('responders').emit(event, data);
}

export function emitToBarangay(barangayId: string, event: string, data: any) {
  io?.to(`barangay_${barangayId}`).emit(event, data);
}
