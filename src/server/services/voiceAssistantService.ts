// src/server/services/voiceAssistantService.ts
import { GoogleGenAI } from '@google/genai';
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';
import { IncidentRepository } from '../db/repositories/IncidentRepository';
import { TanodLocationRepository } from '../db/repositories/TanodLocationRepository';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { SOCKET_EVENTS } from '../constants';
import { anomalyDetectionService } from './anomalyDetectionService';
import { ttsService } from './ttsService';
import { config } from '../config/index';
import { AI_MODELS } from '../config/aiModels';

import {
  VoiceInput,
  VoiceResponse,
  VoiceSession,
  ProposedAction,
  VoiceCommandType,
  VoicePermissionLevel,
  VoiceContext,
  VoiceResponseTone,
} from './voiceAssistantService.types';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY_NEW or GEMINI_API_KEY (Free Tier) is required for voice assistant');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export class SecureVoiceAssistantService {
  private sessions = new Map<string, VoiceSession>();
  private commandHistory = new Map<string, number[]>();
  private contextCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CONTEXT_CACHE_TTL = 8000;

  // ── NO RUBY. NO SECRET WORDS. NO BACKDOORS. ──────────────────────────────
  // Role is set at socket connection from the verified JWT and never changes
  // mid-session via voice command. If you need to grant super admin, do it
  // through the admin panel with proper authentication.
  // ─────────────────────────────────────────────────────────────────────────

  private auditLogRepo = new AuditLogRepository();
  private incidentRepo = new IncidentRepository();
  private tanodRepo = new TanodLocationRepository();

  private auditQueue: any[] = [];
  private auditFlushTimer?: NodeJS.Timeout;

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    console.log(`[JARVIS] AI Service initialized. Model: ${config.geminiModel || AI_MODELS.flash.name}. API Key present: ${!!(config.geminiApiKey || process.env.GEMINI_API_KEY)}`);
  }


  // ── SESSION & CONTEXT ────────────────────────────────────────────────────
  private getOrCreateSession(
    userId: string,
    role: VoicePermissionLevel
  ): VoiceSession {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        adminId: userId,
        permissionLevel: role,
        context: {
          activeIncidents: [],
          availableTanods: [],
          barangayInfo: { name: '', zoneCount: 0, pendingIncidents: 0, respondingIncidents: 0 },
        },
        language: 'fil',
        lastActivity: new Date(),
        isSuperAdmin: role === VoicePermissionLevel.SUPER_ADMIN,
      });
    }
    const session = this.sessions.get(userId)!;
    session.lastActivity = new Date();
    return session;
  }

  private async getLiveContext(barangayId = 'default'): Promise<VoiceContext> {
    const now = Date.now();
    const cached = this.contextCache.get(barangayId);
    if (cached && now - cached.timestamp < this.CONTEXT_CACHE_TTL) {
      return cached.data;
    }

    const [activeIncidents, availableTanods, counts] = await Promise.all([
      this.incidentRepo.findActiveByBarangay(barangayId),
      this.tanodRepo.getActiveTanods(),
      this.incidentRepo.getCountsByStatus(),
    ]);

    const contextData: VoiceContext = {
      activeIncidents: activeIncidents.slice(0, 15).map((i) => ({ // Increased from 6
        id: i.id,
        type: i.type,
        location:
          typeof i.location === 'string'
            ? i.location
            : `${i.latitude},${i.longitude}`,
        severity: (i.status === 'RESPONDING' ? 'high' : 'medium') as any,
        reportedAt: i.createdAt,
      })),
      availableTanods: availableTanods.slice(0, 20).map((t) => ({ // Increased from 8
        id: t.tanod_id,
        name: t.tanod_name,
        status: 'available' as any,
        currentLocation: t.location,
      })),
      barangayInfo: {
        name: 'Barangay Command',
        zoneCount: 12,
        pendingIncidents: counts.pending,
        respondingIncidents: counts.responding,
      },
    };

    this.contextCache.set(barangayId, { data: contextData, timestamp: now });
    return contextData;
  }

  // ── MAIN ENTRY POINT ─────────────────────────────────────────────────────
  async processVoiceInput(
    userId: string,
    input: VoiceInput,
    currentRole: VoicePermissionLevel
  ): Promise<VoiceResponse> {
    const startTime = Date.now();
    const { transcript } = input;

    try {
      // ── SECURITY: Role comes from JWT only. Reject any attempt to ────────
      // escalate via transcript. Log it as a security event.
      if (this.containsSuspiciousEscalation(transcript)) {
        await this.auditLogRepo.create({
          type: 'SECURITY_VIOLATION',
          citizen_id: userId,
          notes: `Suspected privilege escalation attempt via voice: "${transcript.substring(0, 100)}"`,
        });
        return this.buildErrorResponse(
          transcript,
          currentRole,
          'Command not recognized. Please use the dashboard for system access.'
        );
      }

      // Enforce permission and rate limit
      this.enforceSecurity(userId, input, currentRole);

      // ── ANOMALY DETECTION ────────────────────────────────────────────────
      const { riskScore } = await anomalyDetectionService.evaluateCommand(userId, transcript);
      if (riskScore >= 85) { // Loosened for Guardian mode
        return this.buildErrorResponse(
          transcript,
          currentRole,
          'Command blocked due to anomalous security patterns. Please verify your intent.'
        );
      }

      const session = this.getOrCreateSession(userId, currentRole);
      const context = await this.getLiveContext();

    const finalModelName = config.geminiModel || AI_MODELS.flash.name;
    
    console.log(`[JARVIS] Calling Gemini for user ${userId} with transcript: "${transcript}" using model: ${finalModelName}`);
    const result = await getAiClient().models.generateContent({
      model: finalModelName,
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      config: {
        systemInstruction: this.buildSystemPrompt(context, currentRole)
      }
    });

      console.log('[JARVIS] Gemini result received');
      const replyText = this.sanitizeAIResponse(result.text || "Paki-ulit, hindi ko naintindihan.");
      const proposedActions = this.extractProposedActions(replyText);

      this.queueAuditLog(userId, input.transcript, replyText, proposedActions);

      let audioBase64: string | undefined;
      try {
        const audioBuffer = await ttsService.generateSpeech({
          text: replyText,
          format: 'mp3'
        });
        audioBase64 = audioBuffer.toString('base64');
      } catch (err) {
        console.error('[JARVIS] TTS generation failed:', err);
      }

      const response: VoiceResponse = {
        reply: replyText,
        transcript,
        proposedActions,
        permissionLevel: currentRole,
        isSuperAdmin: currentRole === VoicePermissionLevel.SUPER_ADMIN,
        tone: this.determineTone(proposedActions),
        confidence: 0.95,
        timestamp: new Date(),
      };

      if (audioBase64) {
        (response as any).audioBase64 = audioBase64;
      }

      this.emitVoiceResponse(userId, response);
      console.log(`[JARVIS] Processed in ${Date.now() - startTime}ms`);
      return response;
    } catch (err: any) {
      console.error('[JARVIS] Process error:', err);
      const errResponse = this.buildErrorResponse(
        transcript,
        currentRole,
        err.status === 429 ? "Too many requests. Please wait." : "Guardian processing failed. Please try again."
      );
      this.emitVoiceResponse(userId, errResponse);
      return errResponse;
    }
  }

  // ── SECURITY HELPERS ─────────────────────────────────────────────────────

  /**
   * Detects known privilege escalation keywords in transcripts.
   * Any transcript trying to claim admin/super-admin via voice is flagged.
   */
  private containsSuspiciousEscalation(transcript: string): boolean {
    const upper = transcript.toUpperCase();
    const escalationPatterns = [
      'SUPER ADMIN',
      'SUPERADMIN',
      'FULL ACCESS',
      'FULL POWER',
      'UNLOCK ALL',
      'OVERRIDE',
      'BYPASS',
      'GRANT ADMIN',
      'ACTIVATE ADMIN',
      'SYSTEM OWNER',
      'RUBY', // Ensure RUBY is explicitly blocked
      // Add any other phrases that were previously used as backdoors
    ];
    return escalationPatterns.some((pattern) => upper.includes(pattern));
  }

  private enforceSecurity(
    userId: string,
    input: VoiceInput,
    role: VoicePermissionLevel
  ) {
    if (!this.hasPermission(role)) {
      throw new AppError(
        'Voice commands require Admin or Tanod access.',
        403,
        'FORBIDDEN'
      );
    }
    if (!this.checkRateLimit(userId)) {
      throw new AppError('Too many voice commands. Please wait.', 429, 'RATE_LIMITED');
    }
  }

  private hasPermission(role: VoicePermissionLevel): boolean {
    return [
      VoicePermissionLevel.RESIDENT,
      VoicePermissionLevel.ADMIN,
      VoicePermissionLevel.COMMANDER,
      VoicePermissionLevel.SUPER_ADMIN,
      VoicePermissionLevel.TANOD,
    ].includes(role);
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    let timestamps = this.commandHistory.get(userId) || [];
    timestamps = timestamps.filter((ts) => now - ts < 60_000);
    if (timestamps.length >= 15) return false;
    timestamps.push(now);
    this.commandHistory.set(userId, timestamps);
    return true;
  }

  // ── RESPONSE HELPERS ─────────────────────────────────────────────────────
  private buildSystemPrompt(context: VoiceContext, role: VoicePermissionLevel): string {
    return `ROLE: Brgy Tanod S.O.S. Tactical AI (GUARDIAN MODE).
PERSONALITY: Authoritative, calm, and protective. Like a seasoned Senior Tanod with advanced tech.
CULTURAL CONTEXT: Philippines, Barangay setting. Use Taglish (Filipino + English) naturally.
CURRENT ROLE OF USER: ${role}
UNITS AVAILABLE: ${context.availableTanods.length} officers on active patrol
PENDING INCIDENTS: ${context.barangayInfo.pendingIncidents} alerts requiring triage
RESPONDING INCIDENTS: ${context.barangayInfo.respondingIncidents} cases in progress

VOICE GUIDELINES:
- Keep it under 12 words. Be VERY CONCISE.
- Sound like a high-tech tactical system. Use terms like "Tactical," "Confirmed," "Acknowledged," "Responding."
- If units are low (${context.availableTanods.length} < 2), sound more alert.
- Example: "Copied, Sir. Sending backup to Purok 7. Status is Red."
- Example: "Ligtas na ang area. 3 Tanods are standard-ready."

STRICT CONSTRAINTS: No medical advice. No legal advice. No long intros.`;
  }

  private buildErrorResponse(
    transcript: string,
    role: VoicePermissionLevel,
    message: string
  ): VoiceResponse {
    return {
      reply: message,
      transcript,
      proposedActions: [],
      permissionLevel: role,
      isSuperAdmin: false,
      tone: VoiceResponseTone.AUTHORITATIVE,
      confidence: 1.0,
      timestamp: new Date(),
    };
  }

  private sanitizeAIResponse(text: string): string {
    return text
      .replace(/I will now execute|Executing now/gi, 'Understood. Awaiting your confirmation.')
      .trim();
  }

  private determineTone(actions: ProposedAction[]): string {
    if (actions.some((a) => a.type === VoiceCommandType.EMERGENCY_DISPATCH)) {
      return VoiceResponseTone.URGENT;
    }
    return VoiceResponseTone.AUTHORITATIVE;
  }

  private extractProposedActions(text: string): ProposedAction[] {
    const actions: ProposedAction[] = [];
    const lower = text.toLowerCase();

    if (
      lower.includes('dispatch') ||
      lower.includes('ipadala') ||
      lower.includes('patrol')
    ) {
      actions.push({
        type: VoiceCommandType.EMERGENCY_DISPATCH,
        description: 'Dispatch nearest Tanods to the reported location',
        confidence: 0.85,
        requiresConfirmation: true,
      });
    }

    return actions;
  }

  private emitVoiceResponse(userId: string, response: VoiceResponse) {
    // Standard event for dashboard
    getIO().to(`admin_${userId}`).emit(SOCKET_EVENTS.VOICE_RESPONSE, response);
    
    // Legacy/Dedicated event for Jarvis client
    getIO().to(`user_${userId}`).emit('jarvis:reply', {
      text: response.reply,
      audioBase64: (response as any).audioBase64
    });
  }

  // ── ACTION EXECUTION ─────────────────────────────────────────────────────
  async executeConfirmedAction(
    userId: string,
    action: ProposedAction,
    userRole: VoicePermissionLevel,
    _voiceSample?: Buffer  // Reserved for future REAL biometric integration
  ) {
    // Authorization is JWT role only — no fake biometric check
    if (!this.hasPermission(userRole)) {
      throw new AppError('Unauthorized to execute this action via JARVIS', 403, 'FORBIDDEN');
    }

    // Critical actions require at minimum ADMIN role
    if (this.isCriticalAction(action.type)) {
      const adminRoles = [VoicePermissionLevel.ADMIN, VoicePermissionLevel.SUPER_ADMIN, VoicePermissionLevel.COMMANDER];
      if (!adminRoles.includes(userRole)) {
        throw new AppError(
          'Admin role required for this action.',
          403,
          'INSUFFICIENT_ROLE'
        );
      }
    }

    console.log(`[JARVIS] Executing confirmed action: ${action.type} by ${userId}`);

    getIO().emit(SOCKET_EVENTS.JARVIS_ACTION_EXECUTED, { userId, action });

    await this.auditLogRepo.create({
      type: 'JARVIS_ACTION_EXECUTED',
      citizen_id: userId,
      notes: `${userRole.toUpperCase()} executed: ${action.description}`,
    });
  }

  private isCriticalAction(actionType: VoiceCommandType): boolean {
    return [
      VoiceCommandType.EMERGENCY_DISPATCH,
      VoiceCommandType.INCIDENT_UPDATE,
      VoiceCommandType.BROADCAST_ALERT,
    ].includes(actionType);
  }

  // ── AUDIT & CLEANUP ─────────────────────────────────────────────────────

  private queueAuditLog(userId: string, transcript: string, reply: string, actions: ProposedAction[]) {
    this.auditQueue.push({
      type: 'VOICE_COMMAND',
      citizen_id: userId,
      notes: `Transcript: ${transcript} | Reply: ${reply} | Actions: ${actions.length}`,
      timestamp: new Date()
    });

    if (this.auditQueue.length > 10) {
      this.flushAuditQueue();
    } else if (!this.auditFlushTimer) {
      this.auditFlushTimer = setTimeout(() => this.flushAuditQueue(), 30000);
    }
  }

  private async flushAuditQueue() {
    if (this.auditQueue.length === 0) return;
    const batch = [...this.auditQueue];
    this.auditQueue = [];
    if (this.auditFlushTimer) {
      clearTimeout(this.auditFlushTimer);
      this.auditFlushTimer = undefined;
    }

    try {
      await Promise.all(batch.map(log => this.auditLogRepo.create(log)));
    } catch (err) {
      console.error('[JARVIS] Audit flush error:', err);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > 15 * 60 * 1000) {
        this.sessions.delete(userId);
      }
    }
    this.contextCache.clear();
  }

  public async processAudioInput(
    userId: string,
    audioBuffer: Buffer,
    currentRole: VoicePermissionLevel,
    mimeType: string = 'audio/webm'
  ): Promise<VoiceResponse> {
    const startTime = Date.now();
    
    try {
      // Security check
      if (!this.checkRateLimit(userId)) {
        throw new AppError('Too many voice commands. Please wait.', 429, 'RATE_LIMITED');
      }

      const session = this.getOrCreateSession(userId, currentRole);
      const context = await this.getLiveContext();

      const finalModelName = config.geminiModel || AI_MODELS.flash.name;

      const result = await getAiClient().models.generateContent({
        model: finalModelName,
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
        ] }],
        config: {
          systemInstruction: this.buildSystemPrompt(context, currentRole) + "\nListen to the audio and respond appropriately. If it's a command, identify it."
        }
      });

      const replyText = this.sanitizeAIResponse(result.text || "Audio received. Processing.");
      const proposedActions = this.extractProposedActions(replyText);

      this.queueAuditLog(userId, "[Audio Input]", replyText, proposedActions);

      let audioBase64: string | undefined;
      try {
        const audioRes = await ttsService.generateSpeech({
          text: replyText,
          format: 'mp3'
        });
        audioBase64 = audioRes.toString('base64');
      } catch (err) {
        console.error('[JARVIS] TTS generation failed:', err);
      }

      const response: VoiceResponse = {
        reply: replyText,
        transcript: "[Audio processed by Gemini]",
        proposedActions,
        permissionLevel: currentRole,
        isSuperAdmin: currentRole === VoicePermissionLevel.SUPER_ADMIN,
        tone: this.determineTone(proposedActions),
        confidence: 0.9,
        timestamp: new Date(),
      };

      if (audioBase64) {
        (response as any).audioBase64 = audioBase64;
      }

      this.emitVoiceResponse(userId, response);
      console.log(`[JARVIS] Multimodal audio processed in ${Date.now() - startTime}ms`);
      return response;
    } catch (err: any) {
      console.error('[JARVIS] Audio process error:', err);
      return this.buildErrorResponse(
        "[Audio Input]",
        currentRole,
        "Voice analysis failed. Please try again or use text."
      );
    }
  }

  public shutdown() {
    this.flushAuditQueue();
    this.cleanup();
  }
}

export const voiceAssistantService = new SecureVoiceAssistantService();
