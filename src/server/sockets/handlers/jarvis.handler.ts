import { Server } from 'socket.io';
import { config } from '../../config/index';
import { isTanodOrAbove, normalizeRole } from '../../utils/roleUtils';
import { AuthenticatedSocket } from '../../types';

const activeSessions = new Map<string, any>();

const MAX_AUDIO_BUFFER_BYTES = 500_000;   // 500KB hard cap
const MAX_TRANSCRIPT_LENGTH  = 1_000;     // characters

export function setupJarvisHandler(io: Server, socket: AuthenticatedSocket) {
  const { id: userId, role: rawRole } = socket.data.user;
  const role = normalizeRole(rawRole);

  if (!isTanodOrAbove(role)) {
    console.log(`[JARVIS] Access denied for role: ${role} (socket ${socket.id})`);
    return;
  }

  // ── Start session ────────────────────────────────────────────────────
  socket.on('jarvis:start-session', async () => {
    if (activeSessions.has(socket.id)) {
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
      activeSessions.set(socket.id, {
        userId,
        role,
        openedAt: new Date(),
        audioBuffer: [] as Buffer[],
        totalBufferSize: 0,
      });
      socket.emit('jarvis:session-open');
      console.log(`[JARVIS] Session opened for ${userId} (${role})`);
    } catch (err: any) {
      console.error('[JARVIS] Failed to open session:', err);
      socket.emit('jarvis:error', {
        code: 'SESSION_FAILED',
        message: 'Could not open AI session. Please try again.',
      });
    }
  });

  // ── Receive audio chunks ─────────────────────────────────────────────
  socket.on('jarvis:audio-chunk', async (data: { data: string; mimeType: string }) => {
    const session = activeSessions.get(socket.id);
    if (!session) {
      socket.emit('jarvis:error', {
        code: 'NO_SESSION',
        message: 'No active session. Please start a session first.',
      });
      return;
    }

    try {
      const audioBuffer = Buffer.from(data.data, 'base64');

      // Hard cap — prevent buffer flooding
      session.totalBufferSize = (session.totalBufferSize || 0) + audioBuffer.length;
      if (session.totalBufferSize > MAX_AUDIO_BUFFER_BYTES) {
        session.audioBuffer = [];
        session.totalBufferSize = 0;
        socket.emit('jarvis:error', {
          code: 'BUFFER_OVERFLOW',
          message: 'Audio buffer exceeded limit. Please try again.',
        });
        return;
      }

      session.audioBuffer.push(audioBuffer);

      // Process when ~2 seconds of audio accumulated
      if (session.totalBufferSize > 32_000) {
        await processAudioBuffer(socket, session, userId, role);
        session.totalBufferSize = 0;
      }
    } catch (err) {
      console.error('[JARVIS] Audio chunk error:', err);
    }
  });

  // ── Text transcript fallback ─────────────────────────────────────────
  socket.on('jarvis:transcript', (data: { text: string }) => {
    if (!data?.text || typeof data.text !== 'string') return;

    const trimmed = data.text.trim().substring(0, MAX_TRANSCRIPT_LENGTH);
    if (trimmed.length === 0) return;

    // Route through the existing voice-command path
    socket.emit('voice-command', { transcript: trimmed, language: 'fil' });
  });

  // ── End session ──────────────────────────────────────────────────────
  socket.on('jarvis:end-session', () => {
    if (activeSessions.has(socket.id)) {
      activeSessions.delete(socket.id);
      socket.emit('jarvis:session-closed');
      console.log(`[JARVIS] Session closed for ${userId}`);
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

async function processAudioBuffer(
  socket: AuthenticatedSocket,
  session: any,
  userId: string,
  role: string
) {
  session.audioBuffer = [];
  session.totalBufferSize = 0;

  // Full Gemini Live audio streaming is not yet implemented.
  // Audio chunks are acknowledged but not processed.
  // Text-based voice commands flow through the 'voice-command' socket event.
  // To implement: replace this function body with a Gemini Live WebSocket call.
  socket.emit('jarvis:audio-received', {
    message: 'Audio received. Use voice-command event for text-based commands.',
  });

  console.log(`[JARVIS] Audio buffer cleared for ${userId} — Gemini Live not yet wired.`);
}
