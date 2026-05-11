import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { socketAuthMiddleware } from '../middleware/socketAuth';
import { voiceAssistantService } from '../services/voiceAssistantService';
import { VoicePermissionLevel } from '../services/voiceAssistantService.types';
import { setupLocationHandlers, startLocationExpiryTask, getActiveLocations } from './handlers/location.handler';
import { setupIncidentHandlers } from './handlers/incident.handler';
import { config } from '../config/index';
import { normalizeRole, isTanodOrAbove, isAdminOrAbove } from '../utils/roleUtils';

let io: Server;

export { getActiveLocations };

// ---------------------------------------------------------------------------
// Per-socket voice command rate limiter
// Prevents DoS via the 10MB maxHttpBufferSize socket buffer + rapid voice events.
// Each connected socket gets its own independent limiter instance.
// ---------------------------------------------------------------------------
const VOICE_RATE_LIMIT = 10;    // max voice commands
const VOICE_RATE_WINDOW = 60000; // per 60-second rolling window

function createVoiceRateLimiter(): () => boolean {
  const timestamps: number[] = [];
  return function isAllowed(): boolean {
    const now = Date.now();
    const cutoff = now - VOICE_RATE_WINDOW;
    // Evict expired entries from the front of the array
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
    if (timestamps.length >= VOICE_RATE_LIMIT) return false;
    timestamps.push(now);
    return true;
  };
}

// ---------------------------------------------------------------------------
// Socket.IO server init
// ---------------------------------------------------------------------------
export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    pingTimeout: 180000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    connectTimeout: 60000,
    maxHttpBufferSize: 1e7, // 10MB for voice packets
    cookie: false,
    cors: {
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Global socket authentication
  io.use((socket, next) => {
    console.log(`[Socket] New connection attempt: ${socket.id} from ${socket.handshake.address}`);
    socketAuthMiddleware(socket, next);
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const { id, role: rawRole, barangayId } = socket.data.user;

    // Normalize once at connection time — all checks below use this value
    const role = normalizeRole(rawRole);

    console.log(`[Socket] Connected → ${role} ${id} | Barangay: ${barangayId}`);

    // Universal user room (for targeted notifications)
    socket.join(`user_${id}`);

    // Role-based room assignment
    if (isTanodOrAbove(role)) {
      socket.join('responders');
      socket.join(`barangay_${barangayId}`);
      if (isAdminOrAbove(role)) {
        socket.join(`admin_${id}`);
      }
    } else {
      socket.join(`citizen_${id}`);
      socket.join(`barangay_${barangayId}`);
    }

    // Register feature handlers
    setupLocationHandlers(io, socket);
    setupIncidentHandlers(io, socket);

    // Map normalized role to VoicePermissionLevel
    const getPermissionLevel = (r: string): VoicePermissionLevel => {
      const normalized = normalizeRole(r);
      if (normalized === 'admin' || normalized === 'captain' || normalized === 'superadmin') {
        return VoicePermissionLevel.ADMIN;
      }
      if (normalized === 'tanod') return VoicePermissionLevel.TANOD;
      return VoicePermissionLevel.RESIDENT;
    };

    // Create a dedicated rate limiter for this socket connection
    const voiceAllowed = createVoiceRateLimiter();

    // Voice command handler
    socket.on('voice-command', async (data) => {
      if (!voiceAllowed()) {
        socket.emit('voice-error', {
          message: 'Too many voice commands. Please wait before trying again.',
          code: 'RATE_LIMITED',
        });
        return;
      }
      try {
        await voiceAssistantService.processVoiceInput(
          id,
          { transcript: data.transcript, language: 'fil' },
          getPermissionLevel(role)
        );
      } catch (error: any) {
        socket.emit('voice-error', {
          message: error.message,
          code: error.code || 'VOICE_PERMISSION_ERROR',
        });
      }
    });

    // Confirm-action handler (also voice-gated)
    socket.on('confirm-action', async (data) => {
      if (!voiceAllowed()) {
        socket.emit('voice-error', {
          message: 'Too many voice commands. Please wait before trying again.',
          code: 'RATE_LIMITED',
        });
        return;
      }
      try {
        const audioBuffer = data.voiceSample ? Buffer.from(data.voiceSample) : undefined;
        await voiceAssistantService.executeConfirmedAction(
          id,
          data.action,
          getPermissionLevel(role),
          audioBuffer
        );
      } catch (e: any) {
        console.error(e);
        socket.emit('voice-error', {
          message: e.message,
          code: e.code || 'ACTION_FAILED',
        });
      }
    });

    // Heartbeat
    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected → ${role} ${id} | Reason: ${reason}`);
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

export function emitToResponders(event: string, data: any) {
  io?.to('responders').emit(event, data);
}

export function emitToBarangay(barangayId: string, event: string, data: any) {
  io?.to(`barangay_${barangayId}`).emit(event, data);
}

export function emitToRoom(room: string, event: string, data: any) {
  io?.to(room).emit(event, data);
}
