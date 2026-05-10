import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import socket from '../lib/socket';

export function useSocketConnection() {
  const { profile } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      socket.disconnect();
    }
  }, [profile]);
}
