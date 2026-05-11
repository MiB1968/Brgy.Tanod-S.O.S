import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import socket from '../lib/socket';
import { safeStorage } from '../lib/safeStorage';

export function useSocketConnection() {
  const { profile } = useAuthStore();

  useEffect(() => {
    const token = safeStorage.getItem('token');
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
