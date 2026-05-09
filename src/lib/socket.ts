import io from 'socket.io-client';

// Ensure socket transmits authentication token where possible
const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// The server runs on the same port as the client in AI Studio
const socket = io({
  auth: {
    token
  }
});

export default socket;
