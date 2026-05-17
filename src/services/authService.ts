import * as api from '../lib/api';
import * as safeStorage from '../lib/safeStorage';

export const authService = {
  login: async (credentials: any) => {
    const res = await api.auth.login(credentials);
    if (res.token) {
        safeStorage.setItem('token', res.token);
    }
    if (res.user) {
        safeStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },
  register: async (data: any) => {
    const res = await api.auth.register(data);
    if (res.token) {
        safeStorage.setItem('token', res.token);
    }
    if (res.user) {
        safeStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },
  logout: () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
  },
  getProfile: async (id: string) => {
    return await api.auth.getProfile(id);
  },
  updateProfile: async (id: string, data: any) => {
    return await api.auth.updateProfile(id, data);
  }
};
