// src/types/ai.ts

export type GuardianState = 'IDLE' | 'LOADING' | 'READY' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'FALLBACK' | 'ERROR';

export type CrisisType = 'MEDICAL' | 'FIRE' | 'CRIME' | 'DISASTER' | 'DOMESTIC' | 'OTHER' | 'SOS' | 'SECURITY';

export interface GuardianContext {
  pendingSOS: number;
  activeTanods: number;
  isSuperAdmin: boolean;
  sector?: string;
}

export interface GuardianResponse {
  reply: string;
  action?: 'SUMMARIZE' | 'SUGGEST_DISPATCH' | 'STATUS_REPORT' | 'HELP';
  isCrisis?: boolean;
}
