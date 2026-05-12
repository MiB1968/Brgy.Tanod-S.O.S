// src/store/useGuardianStore.ts
import { create } from 'zustand';

export type GuardianStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'OFFLINE' | 'ERROR';

interface GuardianState {
  status: GuardianStatus;
  transcript: string;
  lastResponse: string;
  isEmergency: boolean;
  error: string | null;
  
  // Actions
  setStatus: (status: GuardianStatus) => void;
  setTranscript: (text: string) => void;
  setLastResponse: (text: string) => void;
  setEmergency: (isEmergency: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGuardianStore = create<GuardianState>((set) => ({
  status: 'IDLE',
  transcript: '',
  lastResponse: '',
  isEmergency: false,
  error: null,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setEmergency: (isEmergency) => set({ isEmergency }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    status: 'IDLE',
    transcript: '',
    lastResponse: '',
    isEmergency: false,
    error: null,
  }),
}));
