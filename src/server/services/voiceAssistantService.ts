// src/server/services/voiceAssistantService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';
import { IncidentRepository } from '../db/repositories/IncidentRepository';
import { TanodLocationRepository } from '../db/repositories/TanodLocationRepository';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { SOCKET_EVENTS } from '../constants';
import { anomalyDetectionService } from './anomalyDetectionService';
import { config } from '../config/index';

import {
  VoiceInput,
  VoiceResponse,
  VoiceSession,
  ProposedAction,
  VoiceCommandType,
  VoicePermissionLevel,
  VoiceContext,
  VoiceResponseTone
} from './voiceAssistantService.types';

const genAI = new GoogleGenerativeAI(config.geminiApiKey!);

export class SecureVoiceAssistantService {
  private sessions = new Map<string, VoiceSession>();
  private commandHistory = new Map<string, number[]>(); // timestamp buckets for faster rate limiting

  private contextCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CONTEXT_CACHE_TTL = 8000; // 8 seconds

  private readonly SUPER_ADMIN_WORD = "RUBY";
  private readonly SUPER_ADMIN_DURATION = 30 * 60 * 1000;

  private superAdminSessions = new Map<string, { expiresAt: Date }>();

  private auditLogRepo = new AuditLogRepository();
  private incidentRepo = new IncidentRepository();
  private tanodRepo = new TanodLocationRepository();

  private auditQueue: any[] = [];
  private auditFlushTimer?: NodeJS.Timeout;

  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // every 5 minutes
  }

  // ====================== SESSION & CONTEXT ======================
  private getOrCreateSession(adminId: string, initialRole: VoicePermissionLevel): VoiceSession {
    if (!this.sessions.has(adminId)) {
      this.sessions.set(adminId, {
        adminId,
        permissionLevel: initialRole,
        context: { activeIncidents: [], availableTanods: [], barangayInfo: { name: "", zoneCount: 0, activeAlerts: 0 } },
        language: 'fil',
        lastActivity: new Date(),
        isSuperAdmin: false,
      });
    }
    const session = this.sessions.get(adminId)!;
    session.lastActivity = new Date();
    return session;
  }

  private async getLiveContext(barangayId = 'default'): Promise<any> {
    const now = Date.now();
    const cached = this.contextCache.get(barangayId);

    if (cached && now - cached.timestamp < this.CONTEXT_CACHE_TTL) {
      return cached.data;
    }

    // Parallel fetch for better performance
    const [activeIncidents, availableTanods] = await Promise.all([
      this.incidentRepo.findActiveByBarangay(barangayId),
      this.tanodRepo.getActiveTanods()
    ]);

    const contextData = {
      activeIncidents: activeIncidents.slice(0, 6).map(i => ({
        id: i.id,
        type: i.type,
        location: typeof i.location === 'string' ? i.location : `${i.latitude},${i.longitude}`,
        severity: (i.status === 'RESPONDING' ? 'high' : 'medium') as any,
        reportedAt: i.createdAt
      })),
      availableTanods: availableTanods.slice(0, 8).map(t => ({
        id: t.tanod_id,
        name: t.tanod_name,
        status: 'available' as any,
        currentLocation: t.location
      })),
      barangayInfo: {
        name: "Barangay Sample",
        zoneCount: 12,
        activeAlerts: activeIncidents.length
      }
    };

    this.contextCache.set(barangayId, { data: contextData, timestamp: now });
    return contextData;
  }

  // ====================== MAIN METHOD ======================
  async processVoiceInput(
    adminId: string,
    input: VoiceInput,
    currentRole: VoicePermissionLevel
  ): Promise<VoiceResponse> {

    const startTime = Date.now();
    const { transcript } = input;

    // Super Admin Check (fast path)
    if (transcript.toUpperCase().includes(this.SUPER_ADMIN_WORD)) {
      return this.handleSuperAdminActivation(adminId, transcript);
    }

    const session = this.getOrCreateSession(adminId, currentRole);
    const effectiveRole = this.isSuperAdminActive(adminId) ? VoicePermissionLevel.SUPER_ADMIN : currentRole;

    this.enforceSecurity(adminId, input, effectiveRole);

    // Get cached context
    const context = await this.getLiveContext();

    // Generate response
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // or gemini-2.5-flash for better performance
      systemInstruction: this.buildOptimizedSystemPrompt(context, effectiveRole),
    });

    const result = await model.generateContent(transcript);
    let replyText = result.response.text();

    replyText = this.sanitizeAIResponse(replyText);
    const proposedActions = this.extractProposedActions(replyText);

    // Async audit (non-blocking)
    this.queueAuditLog(adminId, input.transcript, replyText, proposedActions);

    const response: VoiceResponse = {
      reply: replyText,
      transcript,
      proposedActions,
      permissionLevel: effectiveRole,
      isSuperAdmin: session.isSuperAdmin,
      tone: this.determineTone(proposedActions),
      confidence: 0.88,
      timestamp: new Date()
    };

    this.emitVoiceResponse(adminId, response);

    console.log(`[JARVIS] Processed in ${Date.now() - startTime}ms`);
    return response;
  }

  // ====================== OPTIMIZED HELPERS ======================
  private buildOptimizedSystemPrompt(context: any, role: VoicePermissionLevel): string {
    return `You are JARVIS, Barangay Tanod AI Assistant.
Role: ${role}
Context: ${JSON.stringify(context)}
- Be concise and clear for voice output.
- Always ask for confirmation on critical actions.`;
  }

  private isSuperAdminActive(adminId: string): boolean {
    const session = this.superAdminSessions.get(adminId);
    if (!session || new Date() > session.expiresAt) {
      this.superAdminSessions.delete(adminId);
      return false;
    }
    return true;
  }

  private handleSuperAdminActivation(adminId: string, transcript: string): VoiceResponse {
    this.superAdminSessions.set(adminId, { expiresAt: new Date(Date.now() + this.SUPER_ADMIN_DURATION) });

    const response: VoiceResponse = {
      reply: "Super Admin access granted. All systems unlocked.",
      transcript,
      proposedActions: [],
      permissionLevel: VoicePermissionLevel.SUPER_ADMIN,
      isSuperAdmin: true,
      tone: VoiceResponseTone.AUTHORITATIVE,
      confidence: 1.0,
      timestamp: new Date(),
      specialActivation: "RUBY_PROTOCOL"
    };

    this.emitVoiceResponse(adminId, response);
    return response;
  }

  private enforceSecurity(adminId: string, input: VoiceInput, role: VoicePermissionLevel) {
    if (!this.hasPermission(role)) throw new AppError("Access denied", 403);
    if (!this.checkRateLimit(adminId)) throw new AppError("Rate limit exceeded", 429);
  }

  private hasPermission(role: VoicePermissionLevel): boolean {
    return [
      VoicePermissionLevel.ADMIN,
      VoicePermissionLevel.COMMANDER,
      VoicePermissionLevel.SUPER_ADMIN
    ].includes(role);
  }

  private checkRateLimit(adminId: string): boolean {
    const now = Date.now();
    let timestamps = this.commandHistory.get(adminId) || [];
    
    // Keep only last 60 seconds
    timestamps = timestamps.filter(ts => now - ts < 60_000);
    
    if (timestamps.length >= 12) return false; // max 12 commands per minute

    timestamps.push(now);
    this.commandHistory.set(adminId, timestamps);
    return true;
  }

  private queueAuditLog(adminId: string, transcript: string, reply: string, actions: ProposedAction[]) {
    this.auditQueue.push({
      type: 'VOICE_COMMAND',
      citizen_id: adminId,
      notes: transcript.substring(0, 150)
    });

    if (this.auditQueue.length >= 5) {
      this.flushAuditQueue();
    }
  }

  private flushAuditQueue() {
    if (this.auditFlushTimer) clearTimeout(this.auditFlushTimer);
    
    this.auditFlushTimer = setTimeout(async () => {
      if (this.auditQueue.length > 0) {
        // Batch insert if your repo supports it, otherwise loop
        for (const entry of this.auditQueue) {
          await this.auditLogRepo.create(entry).catch(console.error);
        }
        this.auditQueue = [];
      }
    }, 1500);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > 45 * 60 * 1000) {
        this.sessions.delete(id);
      }
    }
    this.contextCache.clear(); // Refresh cache periodically
  }

  // ====================== ACTION EXECUTION & RESPONSE ======================
  private determineTone(actions: ProposedAction[]): string {
    if (actions.some(a => a.type === VoiceCommandType.EMERGENCY_DISPATCH)) return VoiceResponseTone.URGENT;
    return VoiceResponseTone.AUTHORITATIVE;
  }

  private emitVoiceResponse(adminId: string, response: VoiceResponse) {
    getIO().to(`admin_${adminId}`).emit(SOCKET_EVENTS.VOICE_RESPONSE, response);
  }

  private sanitizeAIResponse(text: string): string {
    return text
      .replace(/I will now execute|Executing now/gi, "Understood. Awaiting your confirmation.")
      .trim();
  }

  private extractProposedActions(text: string): ProposedAction[] {
    const actions: ProposedAction[] = [];
    const lower = text.toLowerCase();

    if (lower.includes("dispatch") || lower.includes("ipadala") || lower.includes("patrol")) {
      actions.push({
        type: VoiceCommandType.EMERGENCY_DISPATCH,
        description: "Dispatch nearest Tanods to the reported location",
        confidence: 0.85,
        requiresConfirmation: true,
      });
    }

    return actions;
  }

  async executeConfirmedAction(adminId: string, action: ProposedAction, userRole: VoicePermissionLevel, voiceSample?: Buffer) {
    const effectiveRole = this.isSuperAdminActive(adminId) ? VoicePermissionLevel.SUPER_ADMIN : userRole;
    
    if (!this.hasPermission(effectiveRole)) {
      throw new AppError("Unauthorized to execute this action via JARVIS", 403);
    }

    // Require voice biometrics for critical actions
    if (this.isCriticalAction(action.type)) {
      if (!voiceSample) {
        throw new AppError("Voice verification required for this action.", 401, "VOICE_BIOMETRIC_REQUIRED");
      }

      const { voiceBiometricsService } = await import('./voiceBiometricsService');
      const isVerified = await voiceBiometricsService.verifyVoice(adminId, voiceSample);
      if (!isVerified) {
        throw new AppError("Voice biometric verification failed. Action blocked.", 403, "BIOMETRIC_MISMATCH");
      }
    }

    console.log(`[JARVIS] Executing confirmed action:`, action);

    // Emit to appropriate rooms based on action
    getIO().emit(SOCKET_EVENTS.JARVIS_ACTION_EXECUTED, {
      adminId,
      action
    });

    await this.auditLogRepo.create({
      type: 'JARVIS_ACTION_EXECUTED',
      citizen_id: adminId,
      notes: `${effectiveRole.toUpperCase()} executed: ${action.description}`
    });
  }

  private isCriticalAction(actionType: VoiceCommandType): boolean {
    const criticalTypes = [
      VoiceCommandType.EMERGENCY_DISPATCH,
      VoiceCommandType.INCIDENT_UPDATE,
      VoiceCommandType.BROADCAST_ALERT
    ];
    return criticalTypes.includes(actionType);
  }

  public shutdown() {
    this.flushAuditQueue();
    this.cleanup();
  }
}

export const voiceAssistantService = new SecureVoiceAssistantService();
