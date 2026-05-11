import io from 'socket.io-client';
import { safeStorage } from './safeStorage';

// The server runs on the same port as the client in AI Studio
const socket = io({
  auth: {
    token: safeStorage.getItem('token')
  },
  reconnection: true,
  reconnectionAttempts: 20, // Increase attempts for mobile resilience
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 60000, 
  transports: ['polling', 'websocket'], // Polling first for stable handshake
  autoConnect: false,
  rememberUpgrade: false, // Don't remember a failed or unstable websocket upgrade
  // Explicitly set path to avoid any ambiguity
  path: '/socket.io/',
  secure: true,
  withCredentials: true
});

// Refresh token on every reconnection attempt
socket.io.on('reconnect_attempt', () => {
  const token = safeStorage.getItem('token');
  console.log('[Socket] Reconnection attempt with token:', token ? 'exists' : 'missing');
  socket.auth = { token };
});

// Logging for debug
socket.on('connect', () => {
  console.log('[Socket] Connected to server successfully:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn(`[Socket] Disconnected from server: ${reason}`);
  if (reason === 'io server disconnect' || reason === 'transport close') {
    // Attempt manual reconnect if server kicked us or transport died
    setTimeout(() => {
      if (!socket.connected) socket.connect();
    }, 1000);
  }
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection Error Type:', err.name, 'Message:', err.message);
  
  if (err.message === 'Authentication error' || err.message === 'Authentication required' || err.message === 'Invalid token') {
    console.warn('[Socket] Auth error detected. Attempting to refresh context...');
    const freshToken = safeStorage.getItem('token');
    if (freshToken) {
      socket.auth = { token: freshToken };
      // Delay reconnect slightly
      setTimeout(() => socket.connect(), 500);
    }
  }
  
  // If websocket fails repeatedly, the engine handles the transport fallback 
  // but if we get a persistent 'websocket error', it might be the proxy blocking upgrades
  if (err.message === 'websocket error') {
    console.warn('[Socket] Low-level websocket failure. Socket.IO should fallback to polling automatically.');
  }
});

export default socket;
