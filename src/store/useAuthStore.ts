import { create } from 'zustand';
import * as safeStorage from '../lib/safeStorage';
import { User, ResidentProfile } from '../types';

interface AuthState {
  profile: User | null;
  residentProfile: ResidentProfile | null;
  token: string | null;
  isLoading: boolean;
  setProfile: (profile: User | null) => void;
  setResidentProfile: (profile: ResidentProfile | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: JSON.parse(safeStorage.getItem('user') || 'null'),
  residentProfile: null, // Should probably be loaded separately
  token: safeStorage.getItem('token'),
  isLoading: false,
  setProfile: (profile) => {
    if (profile) safeStorage.setItem('user', JSON.stringify(profile));
    else safeStorage.removeItem('user');
    set({ profile });
  },
  setResidentProfile: (residentProfile) => set({ residentProfile }),
  setToken: (token) => {
    if (token) safeStorage.setItem('token', token);
    else safeStorage.removeItem('token');
    set({ token });
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
    set({ profile: null, residentProfile: null, token: null });
  },
}));
