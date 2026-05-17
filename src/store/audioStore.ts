// src/store/audioStore.ts
import { create } from 'zustand';

interface AudioState {
  masterVolume: number;
  setMasterVolume: (val: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  masterVolume: 0.85,
  setMasterVolume: (val) => set({ masterVolume: val }),
}));
