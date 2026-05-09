import io from 'socket.io-client';

// The server runs on the same port as the client in AI Studio
const socket = io();

export default socket;
