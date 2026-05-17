import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { socketAuthMiddleware } from '../middleware/socketAuth';
import { voiceAssistantService } from '../services/voiceAssistantService';
import { VoicePermissionLevel } from '../services/voiceAssistantService.types';
import { setupLocationHandlers, startLocationExpiryTask, getActiveLocations } from './handlers/location.handler';
import { setupIncidentHandlers } from './handlers/incident.handler';
import { setupJarvisHandler } from './handlers/jarvis.handler';
import { setupGuardianHandler } from './handlers/guardian.handler';
import { config } from '../config/index';
import { logger } from '../utils/logger';
import { normalizeRole, isTanodOrAbove, isAdminOrAbove } from '../utils/roleUtils';

let io: Server;

export { getActiveLocations };

// ---------------------------------------------------------------------------
// Global voice command rate limiter
// Keyed by userId to prevent bypass via socket reconnection.
// ---------------------------------------------------------------------------
const VOICE_RATE_LIMIT = 10;    // max voice commands
const VOICE_RATE_WINDOW = 60000; // per 60-second rolling window
const voiceRateLimits = new Map<string, number[]>();

function isVoiceAllowed(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - VOICE_RATE_WINDOW;
  let timestamps = voiceRateLimits.get(userId) || [];
  
  // Evict expired entries
  timestamps = timestamps.filter(ts => ts > cutoff);
  
  if (timestamps.length >= VOICE_RATE_LIMIT) return false;
  
  timestamps.push(now);
  voiceRateLimits.set(userId, timestamps);
  return true;
}

// ---------------------------------------------------------------------------
// Socket.IO server init
// ---------------------------------------------------------------------------
export function initSocket(server: HttpServer): Server {
  console.log('[Socket] Initializing Socket.IO with server...');
  try {
    io = new Server(server, {
      path: '/socket.io/',
      pingTimeout: 60000,
      pingInterval: 10000,
      transports: ['websocket'],
      connectTimeout: 45000,
      maxHttpBufferSize: 2 * 1024 * 1024, // 2MB for voice packets
      cookie: false,
      cors: {
        origin: (origin, callback) => {
          const allowedOrigins = config.corsOrigin ? config.corsOrigin.split(',').map(o => o.trim()) : [];
          const isStudioPreview = origin && (origin.endsWith('.run.app') || origin.startsWith('http://localhost:3000'));
          const isDevFallback = allowedOrigins.length === 0 && config.nodeEnv !== 'production';

          // Include origin === 'null' to support browser iframes with sandbox attribute where Origin is literally "null"
          // Allow broadly in development to help debug socket/CORS issues
          if (config.nodeEnv !== 'production' || !origin || origin === 'null' || isStudioPreview || isDevFallback || (origin && allowedOrigins.includes(origin))) {
            return callback(null, true);
          }
          logger.warn(`[Socket CORS] Origin rejected: ${origin}. IsStudio: ${isStudioPreview}, DevFallback: ${isDevFallback}, Allowed: ${JSON.stringify(allowedOrigins)}`);
          return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
      },
    });
    console.log('[Socket] Server instance created.');
  } catch (err) {
    console.error('[Socket] FAILED to create Server instance:', err);
    throw err;
  }

  // Global socket authentication
  io.use((socket, next) => {
    console.log(`[Socket] New connection attempt: ${socket.id} from ${socket.handshake.address}`);
    socketAuthMiddleware(socket, next);
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    let inboundBytesThisWindow = 0;
    const windowSize = 60 * 1000;
    const maxBytesPerWindow = 10 * 1024 * 1024;

    socket.onAny((eventName, ...args) => {
      const payloadSize = JSON.stringify(args).length;
      inboundBytesThisWindow += payloadSize;

      if (inboundBytesThisWindow > maxBytesPerWindow) {
        logger.warn(`[SOCKET] Client ${socket.id} exceeds inbound quota`);
        socket.disconnect(true);
      }
    });

    const intervalId = setInterval(() => {
      inboundBytesThisWindow = 0;
    }, windowSize);

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
    setupJarvisHandler(io, socket);
    setupGuardianHandler(io, socket);

    // Map normalized role to VoicePermissionLevel
    const getPermissionLevel = (r: string): VoicePermissionLevel => {
      const normalized = normalizeRole(r);
      if (normalized === 'admin' || normalized === 'captain' || normalized === 'superadmin') {
        return VoicePermissionLevel.ADMIN;
      }
      if (normalized === 'tanod') return VoicePermissionLevel.TANOD;
      return VoicePermissionLevel.RESIDENT;
    };

    // Voice command handler
    socket.on('voice-command', async (data, callback) => {
      // Input validation
      if (!data || typeof data.transcript !== 'string' || data.transcript.trim().length === 0) {
        const error = {
          message: 'Invalid voice command payload.',
          code: 'INVALID_INPUT',
        };
        socket.emit('voice-error', error);
        if (callback) callback({ success: false, error });
        return;
      }

      if (data.transcript.length > 1000) {
        const error = {
          message: 'Voice command too long. Please keep commands under 1000 characters.',
          code: 'INPUT_TOO_LONG',
        };
        socket.emit('voice-error', error);
        if (callback) callback({ success: false, error });
        return;
      }

      if (!isVoiceAllowed(id)) {
        const error = {
          message: 'Too many voice commands. Please wait before trying again.',
          code: 'RATE_LIMITED',
        };
        socket.emit('voice-error', error);
        if (callback) callback({ success: false, error });
        return;
      }

      try {
        const response = await voiceAssistantService.processVoiceInput(
          id,
          {
            transcript: data.transcript.trim(),
            language: data.language || 'fil',
          },
          getPermissionLevel(role)
        );
        if (callback) callback({ success: true, data: response });
      } catch (error: any) {
        const errPayload = {
          message: error.message,
          code: error.code || 'VOICE_PERMISSION_ERROR',
        };
        socket.emit('voice-error', errPayload);
        if (callback) callback({ success: false, error: errPayload });
      }
    });

    // Confirm-action handler (also voice-gated)
    socket.on('confirm-action', async (data) => {
      if (!isVoiceAllowed(id)) {
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
      clearInterval(intervalId);
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
