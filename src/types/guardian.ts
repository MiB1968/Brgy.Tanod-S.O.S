// src/types/guardian.ts

export type GuardianState = 'IDLE' | 'READY' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'FALLBACK';

export type CrisisType = 'MEDICAL' | 'FIRE' | 'CRIME' | 'DISASTER' | 'DOMESTIC' | 'OTHER';

export interface Protocol {
  id: string;
  title: string;
  type: CrisisType;
  keywords: string[];
  instructions: string;
  actions: string[];
}

export interface GuardianResponse {
  intent: CrisisType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  tagalogResponse: string;
  actions: string[];
  protocolRef: string | null;
  timestamp: number;
}

export interface CachedAudio {
  key: string;
  text: string;
  blob?: Blob;
  timestamp: number;
}

export interface DeviceProfile {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  chunkSize: number;
}
