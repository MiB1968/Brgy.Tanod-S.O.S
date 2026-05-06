import { create } from 'zustand';

interface SystemState {
  isOnline: boolean;
  queuedSOSCount: number;
  lastSyncTime: number;
  triggerSync: () => void;
  setIsOnline: (isOnline: boolean) => void;
  setQueuedSOSCount: (count: number) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  queuedSOSCount: 0,
  lastSyncTime: 0,
  triggerSync: () => set({ lastSyncTime: Date.now() }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setQueuedSOSCount: (queuedSOSCount) => set({ queuedSOSCount }),
}));
