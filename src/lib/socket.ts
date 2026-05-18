import io from 'socket.io-client';
import * as safeStorage from './safeStorage';

// The server runs on the same port as the client in AI Studio
const token = safeStorage.getItem('token');
const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
  autoConnect: true,
  auth: () => ({
    token: safeStorage.getItem('token')
  }),
  rememberUpgrade: false,
  path: '/socket.io',
  transports: ['websocket'],
  timeout: 60000, 
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
