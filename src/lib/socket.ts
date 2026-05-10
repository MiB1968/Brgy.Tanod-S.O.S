import io from 'socket.io-client';

// The server runs on the same port as the client in AI Studio
const socket = io({
  auth: {
    token: localStorage.getItem('token')
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

// Periodic check to ensure token is fresh if it changes in storage
socket.on('connect_error', (err) => {
  if (err.message === 'Authentication error') {
    const freshToken = localStorage.getItem('token');
    if (freshToken) {
      socket.auth = { token: freshToken };
      socket.connect();
    }
  }
});

export default socket;
