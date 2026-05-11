import io from 'socket.io-client';

// The server runs on the same port as the client in AI Studio
const socket = io({
  auth: {
    token: localStorage.getItem('token')
  },
  reconnection: true,
  reconnectionAttempts: Infinity, 
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 45000, // Increased timeout
  transports: ['polling', 'websocket'], // Polling first for better connectivity through firewalls/iframes
  autoConnect: true,
});

// Refresh token on every reconnection attempt
socket.on('reconnect_attempt', () => {
  socket.auth = {
    token: localStorage.getItem('token')
  };
});

// Logging for debug
socket.on('connect', () => {
  console.log('[Socket] Connected to server');
});

socket.on('disconnect', (reason) => {
  console.warn(`[Socket] Disconnected: ${reason}`);
  if (reason === 'io server disconnect') {
    // the disconnection was initiated by the server, you need to reconnect manually
    socket.connect();
  }
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection Error:', err.message);
  if (err.message === 'Authentication error') {
    const freshToken = localStorage.getItem('token');
    if (freshToken) {
      socket.auth = { token: freshToken };
      socket.connect();
    }
  }
});

export default socket;
