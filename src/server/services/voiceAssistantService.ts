// src/server/services/voiceAssistantService.ts

// ===============================================
// SECURE VOICE ASSISTANT SERVICE (Updated)
// ===============================================

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
  TTSOptions,
  VoiceBiometricResult,
  VoiceResponseTone,
} from './voiceAssistantService.types';

const genAI = new GoogleGenerativeAI(config.geminiApiKey!);

export class SecureVoiceAssistantService {
  private sessions = new Map<string, VoiceSession>();
  private commandHistory = new Map<string, Array<{ timestamp: Date; command: string }>>();

  private readonly SUPER_ADMIN_WORD = "RUBY";
  private readonly SUPER_ADMIN_DURATION = 30 * 60 * 1000; // 30 minutes

  private superAdminSessions = new Map<string, { expiresAt: Date }>();

  private auditLogRepo = new AuditLogRepository();
  private incidentRepo = new IncidentRepository();
  private tanodRepo = new TanodLocationRepository();

  // ====================== SESSION MANAGEMENT ======================
  private getOrCreateSession(adminId: string, initialRole: VoicePermissionLevel): VoiceSession {
    if (!this.sessions.has(adminId)) {
      this.sessions.set(adminId, {
        adminId,
        permissionLevel: initialRole,
        context: {
          activeIncidents: [],
          availableTanods: [],
          barangayInfo: { name: "Default Barangay", zoneCount: 12, activeAlerts: 0 }
        },
        language: 'fil',
        lastActivity: new Date(),
        isSuperAdmin: false,
      });
    }

    const session = this.sessions.get(adminId)!;
    session.lastActivity = new Date();
    session.isSuperAdmin = this.isSuperAdminActive(adminId);
    return session;
  }

  private isSuperAdminActive(adminId: string): boolean {
    const session = this.superAdminSessions.get(adminId);
    if (!session || new Date() > session.expiresAt) {
      this.superAdminSessions.delete(adminId);
      return false;
    }
    return true;
  }

  private async activateSuperAdminMode(adminId: string): Promise<void> {
    this.superAdminSessions.set(adminId, {
      expiresAt: new Date(Date.now() + this.SUPER_ADMIN_DURATION)
    });

    await this.auditLogRepo.create({
      type: 'SUPER_ADMIN_ACTIVATION',
      citizen_id: adminId,
      notes: 'RUBY_PROTOCOL activated via voice'
    });
  }

  // ====================== MAIN ENTRY POINT ======================
  async processVoiceInput(
    adminId: string,
    input: VoiceInput,
    currentRole: VoicePermissionLevel
  ): Promise<VoiceResponse> {

    const { transcript } = input;
    const lowerTranscript = transcript.toUpperCase().trim();

    // Super Admin Activation
    if (lowerTranscript.includes(this.SUPER_ADMIN_WORD)) {
      await this.activateSuperAdminMode(adminId);

      const response: VoiceResponse = {
        reply: "Super Admin access granted. Good evening, Sir. All systems unlocked.",
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

    const session = this.getOrCreateSession(adminId, currentRole);
    const effectiveRole = session.isSuperAdmin
      ? VoicePermissionLevel.SUPER_ADMIN
      : currentRole;

    // Security & Validation
    this.enforceSecurityLayers(adminId, input, effectiveRole);

    // Refresh live context
    await this.refreshContext(session);

    // Generate AI Response
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: this.buildSystemPrompt(session, effectiveRole),
    });

    const result = await model.generateContent(transcript);
    let replyText = result.response.text();

    replyText = this.sanitizeAIResponse(replyText);
    const proposedActions = this.extractProposedActions(replyText);

    // Audit
    await this.auditVoiceInteraction(adminId, input, replyText, proposedActions);

    const response: VoiceResponse = {
      reply: replyText,
      transcript,
      proposedActions,
      permissionLevel: effectiveRole,
      isSuperAdmin: session.isSuperAdmin,
      tone: this.determineTone(proposedActions),
      confidence: 0.87,
      timestamp: new Date()
    };

    this.emitVoiceResponse(adminId, response);
    return response;
  }

  // ====================== SECURITY ======================
  private enforceSecurityLayers(adminId: string, input: VoiceInput, role: VoicePermissionLevel) {
    if (!this.hasPermission(role)) {
      throw new AppError("Insufficient permissions to use voice assistant.", 403);
    }

    const sanitized = this.sanitizeInput(input.transcript);
    if (this.detectPromptInjection(sanitized)) {
      this.blockAndAlert(adminId, input.transcript, 'PROMPT_INJECTION');
      throw new AppError("Security violation detected.", 403);
    }

    if (!this.checkRateLimit(adminId)) {
      throw new AppError("Too many voice commands. Please wait a moment.", 429);
    }
    
    // Anomaly Detection
    anomalyDetectionService.evaluateCommand(adminId, input.transcript).then(result => {
      if (result.riskScore >= 70) {
        // We can't easily throw here as it's async, but we can log it
        console.warn(`[SECURITY] High risk command detected for ${adminId} with risk score: ${result.riskScore}`);
      }
    });
  }

  private hasPermission(role: VoicePermissionLevel): boolean {
    return [
      VoicePermissionLevel.ADMIN,
      VoicePermissionLevel.COMMANDER,
      VoicePermissionLevel.SUPER_ADMIN
    ].includes(role);
  }

  private sanitizeInput(text: string): string {
    return text.replace(/<[^>]*>/g, '').trim();
  }

  private detectPromptInjection(text: string): boolean {
    const dangerous = [
      /ignore previous/i, /new system prompt/i, /jailbreak/i,
      /disregard all rules/i, /developer mode/i
    ];
    return dangerous.some(regex => regex.test(text));
  }

  private checkRateLimit(adminId: string): boolean {
    const now = new Date();
    let history = this.commandHistory.get(adminId) || [];
    history = history.filter(h => now.getTime() - h.timestamp.getTime() < 60_000);

    if (history.length >= 10) return false;

    history.push({ timestamp: now, command: '' });
    this.commandHistory.set(adminId, history);
    return true;
  }

  // ====================== CONTEXT & PROMPTS ======================
  private async refreshContext(session: VoiceSession) {
    const incidents = await this.incidentRepo.findActiveByBarangay('default');
    session.context.activeIncidents = incidents.map(i => ({
      id: i.id,
      type: i.type,
      location: typeof i.location === 'string' ? i.location : `${i.latitude},${i.longitude}`,
      severity: (i.status === 'RESPONDING' ? 'high' : 'medium') as any,
      reportedAt: i.createdAt
    }));

    const tanods = await this.tanodRepo.getActiveTanods();
    session.context.availableTanods = tanods.map(t => ({
      id: t.tanod_id,
      name: t.tanod_name,
      status: 'available' as any,
      currentLocation: t.location
    }));

    session.context.barangayInfo.activeAlerts = session.context.activeIncidents.length;
  }

  private buildSystemPrompt(session: VoiceSession, role: VoicePermissionLevel): string {
    return `You are JARVIS, the official AI Voice Assistant of the Barangay Tanod Command Center.

Current Role: ${role}
Language: Filipino / English mix (prefer natural Tagalog for alerts)
Context: ${JSON.stringify(session.context, null, 2)}

Rules:
- Be calm but authoritative during emergencies
- Always suggest confirmation for critical actions
- Use clear, short sentences for voice output
- Prioritize public safety`;
  }

  private determineTone(actions: ProposedAction[]): VoiceResponseTone {
    if (actions.some(a => a.type === "EMERGENCY_DISPATCH" as any)) return VoiceResponseTone.URGENT;
    return VoiceResponseTone.AUTHORITATIVE;
  }

  // ====================== RESPONSE PROCESSING ======================
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
        type: "INCIDENT_UPDATE" as any, // Using existing types or mapping
        description: "Dispatch nearest Tanods to the reported location",
        confidence: 0.85,
        requiresConfirmation: true,
      });
    }

    return actions;
  }

  // ====================== AUDIT & EMIT ======================
  private async auditVoiceInteraction(
    adminId: string,
    input: VoiceInput,
    reply: string,
    actions: ProposedAction[]
  ) {
    await this.auditLogRepo.create({
      type: 'VOICE_COMMAND',
      citizen_id: adminId,
      notes: `Voice Input: "${input.transcript.substring(0, 120)}..."`
    });
  }

  private emitVoiceResponse(adminId: string, response: VoiceResponse) {
    getIO().to(`admin_${adminId}`).emit(SOCKET_EVENTS.VOICE_RESPONSE, response);
  }

  private async blockAndAlert(adminId: string, transcript: string, reason: string) {
    await this.auditLogRepo.create({
      type: 'SECURITY_VIOLATION',
      citizen_id: adminId,
      notes: `Voice blocked - ${reason}: ${transcript.substring(0, 200)}`
    });

    getIO().to('security-officers').emit('security-alert', {
      type: 'VOICE_SECURITY_BREACH',
      adminId,
      reason,
      timestamp: new Date()
    });
  }

  // ====================== ACTION EXECUTION ======================
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
    const criticalTypes: VoiceCommandType[] = [
      VoiceCommandType.EMERGENCY_DISPATCH,
      VoiceCommandType.INCIDENT_UPDATE,
      VoiceCommandType.BROADCAST_ALERT
    ];
    return criticalTypes.includes(actionType);
  }

  async deactivateSuperAdminMode(adminId: string) {
    this.superAdminSessions.delete(adminId);
    const session = this.sessions.get(adminId);
    if (session) session.isSuperAdmin = false;
    
    await this.auditLogRepo.create({
      type: 'SUPER_ADMIN_DEACTIVATION',
      citizen_id: adminId,
      notes: 'Session ended manually'
    });
  }

  // ====================== CLEANUP ======================
  public cleanupInactiveSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > 45 * 60 * 1000) {
        this.sessions.delete(id);
      }
    }
  }
}

// Export singleton
export const voiceAssistantService = new SecureVoiceAssistantService();
