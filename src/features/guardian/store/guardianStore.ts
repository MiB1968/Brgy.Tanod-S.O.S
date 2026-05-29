import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type GuardianState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR' | 'OFFLINE';

interface GuardianStore {
  state: GuardianState;
  transcript: string;
  lastResponse: string;
  isEmergency: boolean;
  setState: (state: GuardianState) => void;
  setTranscript: (text: string) => void;
  setResponse: (text: string) => void;
  triggerEmergency: (priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => void;
  reset: () => void;
}

export const useGuardianStore = create<GuardianStore>()(
  devtools((set) => ({
    state: 'IDLE',
    transcript: '',
    lastResponse: '',
    isEmergency: false,

    setState: (state) => set({ state }),
    setTranscript: (transcript) => set({ transcript }),
    setResponse: (lastResponse) => set({ lastResponse }),
    triggerEmergency: (priority) => {
      set({ isEmergency: true, state: 'PROCESSING' });
      // Emit Socket.IO event
      window.dispatchEvent(new CustomEvent('guardian:emergency', { detail: { priority } }));
    },
    reset: () => set({ state: 'IDLE', transcript: '', isEmergency: false }),
  }))
);
