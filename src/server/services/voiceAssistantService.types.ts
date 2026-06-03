// ===============================================
// VOICE ASSISTANT TYPES
// ===============================================

export enum VoiceCommandType {
  EMERGENCY_DISPATCH    = "EMERGENCY_DISPATCH",
  PATROL_ASSIGNMENT     = "PATROL_ASSIGNMENT",
  INCIDENT_UPDATE       = "INCIDENT_UPDATE",
  STATUS_INQUIRY        = "STATUS_INQUIRY",
  BROADCAST_ALERT       = "BROADCAST_ALERT",
  SYSTEM_CHECK          = "SYSTEM_CHECK",
  REPORT_GENERATION     = "REPORT_GENERATION",
  UNKNOWN               = "UNKNOWN",
  // NOTE: SUPER_ADMIN_ACTIVATION removed — role escalation via voice
  // is not supported. Use the admin panel with proper authentication.
}

export enum VoicePermissionLevel {
  RESIDENT    = "resident",
  TANOD       = "tanod",
  ADMIN       = "admin",
  COMMANDER   = "commander",
  SUPER_ADMIN = "super_admin",
}

export enum VoiceResponseTone {
  CALM          = "calm",
  URGENT        = "urgent",
  AUTHORITATIVE = "authoritative",
  REASSURING    = "reassuring",
  ALERT         = "alert",
}

/** Live context passed to Gemini */
export interface VoiceContext {
  activeIncidents: Array<{
    id: string;
    type: string;
    location: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reportedAt: Date;
  }>;
  availableTanods: Array<{
    id: string;
    name: string;
    status: 'available' | 'on_patrol' | 'responding' | 'offline';
    currentLocation?: { lat: number; lng: number };
  }>;
  barangayInfo: {
    name: string;
    zoneCount: number;
    pendingIncidents: number;
    respondingIncidents: number;
  };
}

/** Input coming from frontend */
export interface VoiceInput {
  transcript: string;
  confidence?: number;
  language: 'en' | 'fil' | 'en-PH' | 'fil-PH';
  rawAudio?: Buffer;
  audioDuration?: number;
  deviceInfo?: {
    deviceId: string;
    platform: string;
  };
}

/** Action that JARVIS proposes */
export interface ProposedAction {
  type: VoiceCommandType;
  description: string;
  confidence: number;
  requiresConfirmation: boolean;
  payload?: Record<string, any>;
  estimatedTime?: number;
}

/** Final response sent back to client */
export interface VoiceResponse {
  reply: string;
  transcript: string;
  proposedActions: ProposedAction[];
  permissionLevel: VoicePermissionLevel;
  isSuperAdmin: boolean;
  tone: string;
  confidence: number;
  timestamp: Date;
  // NOTE: specialActivation / RUBY_PROTOCOL field permanently removed.
  metadata?: Record<string, any>;
}

/** Voice Session */
export interface VoiceSession {
  adminId: string;
  permissionLevel: VoicePermissionLevel;
  context: VoiceContext;
  language: 'en' | 'fil' | 'en-PH' | 'fil-PH';
  lastActivity: Date;
  isSuperAdmin: boolean;
}

/** TTS Configuration */
export interface TTSOptions {
  provider: 'elevenlabs' | 'fish' | 'browser';
  voiceId?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  referenceAudioPath?: string;
  tone?: VoiceResponseTone;
}

/** Voice Biometric Result */
export interface VoiceBiometricResult {
  verified: boolean;
  confidence: number;
  voicePrintId?: string;
  message?: string;
}

/** Audit Log Entry for Voice */
export interface VoiceAuditEntry {
  type: 'VOICE_COMMAND' | 'SECURITY_VIOLATION' | 'ACTION_EXECUTED';
  adminId: string;
  transcript: string;
  response?: string;
  actions?: ProposedAction[];
  success: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
}
