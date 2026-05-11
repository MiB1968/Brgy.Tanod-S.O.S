
export type VoiceRole = 'ADMIN' | 'SUPER_ADMIN' | 'TANOD' | 'RESIDENT' | 'SYSTEM';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isAwake: boolean;
  lastCommand?: string;
  error?: string;
}

export interface GuardianSuggestion {
  id: string;
  type: 'URGENT' | 'INFO' | 'ACTION';
  text: string;
  action?: () => void;
}
