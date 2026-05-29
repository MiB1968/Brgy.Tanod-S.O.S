import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  liteMode: boolean;
  toggleLiteMode: () => void;
  setLiteMode: (mode: boolean) => void;
  isLowEndDevice: boolean;
  setIsLowEndDevice: (isLow: boolean) => void;
}

// Basic hardware check for first launch heuristics
const detectLowEndHardware = (): boolean => {
  if (typeof window === 'undefined') return false;
  const memory = (navigator as any).deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  return memory <= 4 || cores <= 4;
};

const _isLow = detectLowEndHardware();

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      liteMode: _isLow, // Default to true if low-end hardware detected
      isLowEndDevice: _isLow,
      toggleLiteMode: () => set((state) => ({ liteMode: !state.liteMode })),
      setLiteMode: (mode: boolean) => set({ liteMode: mode }),
      setIsLowEndDevice: (isLowEndDevice) => set({ isLowEndDevice }),
    }),
    {
      name: 'brgy-tanod-settings',
    }
  )
);
