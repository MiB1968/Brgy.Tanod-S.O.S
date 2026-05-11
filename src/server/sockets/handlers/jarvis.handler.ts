// src/server/sockets/handlers/jarvis.handler.ts
import { Server, Socket } from 'socket.io';
import { config } from '../../config/index';
import { normalizeRole, isAdminOrAbove, isTanodOrAbove } from '../../utils/roleUtils';
import { AuthenticatedSocket } from '../../types';

// Map of socket ID → active Gemini Live session
const activeSessions = new Map<string, any>();

export function setupJarvisHandler(io: Server, socket: AuthenticatedSocket) {
  const { id: userId, role: rawRole } = socket.data.user;
  const role = normalizeRole(rawRole);

  // ── Only admins and tanods can use JARVIS ────────────────────────────
  if (!isTanodOrAbove(role)) {
    console.log(`[JARVIS] Access denied for role: ${role} (socket ${socket.id})`);
    return; // Don't register any handlers — role blocked at connection
  }

  // ── Request to start a Gemini Live session ───────────────────────────
  socket.on('jarvis:start-session', async () => {
    if (activeSessions.has(socket.id)) {
      console.log(`[JARVIS] Session already exists for socket ${socket.id}`);
      socket.emit('jarvis:session-open');
      return;
    }

    if (!config.geminiApiKey) {
      socket.emit('jarvis:error', {
        code: 'AI_NOT_CONFIGURED',
        message: 'AI assistant is not configured on this server.',
      });
      return;
    }

    try {
      console.log(`[JARVIS] Opening Gemini session for user ${userId} (${role})`);

      // Store a simple session marker — full Gemini Live streaming
      // requires the @google/genai Live API which needs WebSocket.
      // For now we store session metadata; audio goes through
      // the processVoiceInput path via text transcript.
      activeSessions.set(socket.id, {
        userId,
        role,
        openedAt: new Date(),
        audioBuffer: [] as Buffer[],
      });

      socket.emit('jarvis:session-open');
      console.log(`[JARVIS] Session opened for ${userId}`);
    } catch (err: any) {
      console.error('[JARVIS] Failed to open session:', err);
      socket.emit('jarvis:error', {
        code: 'SESSION_FAILED',
        message: 'Could not open AI session. Please try again.',
      });
    }
  });

  // ── Receive audio chunks from client ────────────────────────────────
  socket.on('jarvis:audio-chunk', async (data: { data: string; mimeType: string }) => {
    const session = activeSessions.get(socket.id);
    if (!session) {
      socket.emit('jarvis:error', {
        code: 'NO_SESSION',
        message: 'No active session. Please start a session first.',
      });
      return;
    }

    // Buffer incoming audio chunks
    // In a full implementation, these would be forwarded to Gemini Live WebSocket.
    // For now, we accumulate and process on silence detection or manual send.
    try {
      const audioBuffer = Buffer.from(data.data, 'base64');
      session.audioBuffer.push(audioBuffer);

      // If buffer is large enough (roughly 2 seconds of audio), process it
      const totalSize = session.audioBuffer.reduce((sum: number, b: Buffer) => sum + b.length, 0);
      if (totalSize > 32000) {
        // ~2 seconds of 16kHz mono PCM
        await processAudioBuffer(socket, session, userId, role);
      }
    } catch (err) {
      console.error('[JARVIS] Audio chunk error:', err);
    }
  });

  // ── End session ──────────────────────────────────────────────────────
  socket.on('jarvis:end-session', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      activeSessions.delete(socket.id);
      socket.emit('jarvis:session-closed');
      console.log(`[JARVIS] Session closed for user ${userId}`);
    }
  });

  // ── Cleanup on disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (activeSessions.has(socket.id)) {
      activeSessions.delete(socket.id);
      console.log(`[JARVIS] Cleaned up session on disconnect for ${userId}`);
    }
  });
}

/**
 * Process buffered audio by converting to text via browser STT result
 * and running through the voice assistant service.
 *
 * NOTE: For full Gemini Live audio-in/audio-out, replace this with
 * a direct @google/genai Live WebSocket connection on the server.
 * The architecture (client → our socket → Gemini) is already correct;
 * this function is the processing bridge.
 */
async function processAudioBuffer(
  socket: AuthenticatedSocket,
  session: any,
  userId: string,
  role: string
) {
  // Clear buffer
  session.audioBuffer = [];

  // The actual Gemini Live audio streaming implementation goes here.
  // For now emit a ready signal so the client knows audio was received.
  // The text-based voice commands still flow through the existing
  // 'voice-command' socket event handled in sockets/index.ts.
  console.log(`[JARVIS] Audio buffer processed for ${userId} (${session.audioBuffer?.length || 0} chunks)`);
}
