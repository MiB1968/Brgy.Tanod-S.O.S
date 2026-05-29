import io from 'socket.io-client';
import * as safeStorage from './safeStorage';

// The server runs on the same port as the client in AI Studio
const token = safeStorage.getItem('token');
const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
const socket = io(socketUrl, {
  autoConnect: false,
  auth: { token: safeStorage.getItem('token') },
  rememberUpgrade: true,
  path: '/socket.io',
  transports: ['websocket'], // For serverless environments like Cloud Run, forcing websocket immediately avoids session stickiness polling timeouts.
  timeout: 45000, 
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000
});

// Update auth token before any connection or reconnection
const updateSocketAuth = () => {
  const token = safeStorage.getItem('token');
  if (token) {
    socket.auth = { token };
  } else {
    socket.auth = {};
  }
};

socket.on('reconnect_attempt', updateSocketAuth);

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
  // Log as warning rather than error to avoid showing disruptive red overlays in sandbox previews
  console.warn('[Socket] Connection warning (auto-reconnecting):', err.message);
  
  if (err.message === 'Authentication error' || err.message === 'Authentication required' || err.message === 'Invalid token' || err.message === 'No token provided') {
    console.warn('[Socket] Auth error detected. Attempting to refresh context...');
    updateSocketAuth();
    
    const freshToken = safeStorage.getItem('token');
    if (freshToken) {
      // Delay reconnect to avoid hammering
      setTimeout(() => {
        if (!socket.connected) socket.connect();
      }, 5000);
    }
  }
  
  // If websocket fails repeatedly, the engine handles the transport fallback 
  if (err.message === 'websocket error') {
    console.warn('[Socket] Low-level websocket failure. Socket.IO should fallback to polling automatically.');
  }
});

export default socket;
