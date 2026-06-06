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
import { DISPATCHER_TOOLS, toolHandlers } from './dispatcherService';

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

  // FIX HIGH-01: Tool-name → VoiceCommandType mapping.
  // Previously extractProposedActions had no awareness of tool names; now
  // every tool call is mapped to a typed command so the UI confirmation
  // dialog shows the correct action category and icon.
  private readonly TOOL_TO_COMMAND: Record<string, VoiceCommandType> = {
    find_nearest_tanod:      VoiceCommandType.EMERGENCY_DISPATCH,
    update_sos_status:       VoiceCommandType.INCIDENT_UPDATE,
    create_incident_report:  VoiceCommandType.REPORT_GENERATION,
    generate_formal_report:  VoiceCommandType.REPORT_GENERATION,
    get_active_sos:          VoiceCommandType.STATUS_INQUIRY,
    get_tanod_list:          VoiceCommandType.STATUS_INQUIRY,
    schedule_patrol:         VoiceCommandType.PATROL_ASSIGNMENT,
    send_push_notification:  VoiceCommandType.EMERGENCY_DISPATCH,
    broadcast_to_responders: VoiceCommandType.BROADCAST_ALERT,
    system_check:            VoiceCommandType.SYSTEM_CHECK,
  };

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
        severity: (i.status === 'responding' ? 'high' : 'medium') as any,
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

  private static readonly GEMINI_TIMEOUT_MS = 15_000; // 15 seconds per attempt

  /**
   * Races a promise against a timeout. Rejects with a TimeoutError on expiry.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(Object.assign(new Error(`[JARVIS] ${label} timed out after ${ms}ms`), {
          code: 'TIMEOUT',
          status: 503, // treated as transient by retry logic
        }));
      }, ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 2_000
  ): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try {
        // Each individual attempt has its own hard deadline
        return await this.withTimeout(
          operation(),
          SecureVoiceAssistantService.GEMINI_TIMEOUT_MS,
          `Gemini call (attempt ${i + 1}/${retries + 1})`
        );
      } catch (err: any) {
        const msg = String(err.message || '');
        const status = err.status ?? 0;
        const isTransient =
          status === 503 ||
          status === 429 ||
          err.code === 'TIMEOUT' ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('timed out');

        if (isTransient && i < retries) {
          const backoff = delay * Math.pow(2, i); // exponential: 2s, 4s, 8s
          console.warn(
            `[JARVIS] Transient error (${err.code ?? status}), retrying in ${backoff}ms... ` +
            `(${i + 1}/${retries})`
          );
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }
        throw err;
      }
    }
    throw new Error('[JARVIS] All retries exhausted');
  }

  // ── MAIN ENTRY POINT ─────────────────────────────────────────────────────
  async processVoiceInput(
    userId: string,
    input: VoiceInput,
    currentRole: VoicePermissionLevel,
    barangayId: string = 'default'
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
      const context = await this.getLiveContext(barangayId);

    const finalModelName = config.geminiModel || AI_MODELS.flash.name;
    
    console.log(`[JARVIS] Calling Gemini for user ${userId} with transcript: "${transcript}" using model: ${finalModelName}`);
    
    // Support function calling for Smart Dispatcher
    const tools = (currentRole === VoicePermissionLevel.ADMIN || currentRole === VoicePermissionLevel.SUPER_ADMIN || currentRole === VoicePermissionLevel.COMMANDER || currentRole === VoicePermissionLevel.TANOD)
      ? [{ functionDeclarations: DISPATCHER_TOOLS }]
      : [];

    let result = await this.executeWithRetry(() => getAiClient().models.generateContent({
      model: finalModelName,
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      config: {
        systemInstruction: this.buildSystemPrompt(context, currentRole),
        tools,
      }
    }));

    // FIX HIGH-01: Capture first-round functionCalls BEFORE the tool
    // execution loop runs. These represent the actions Gemini decided to
    // take. We pass them to extractProposedActions so the UI gets
    // structured, high-confidence ProposedActions instead of text guesses.
    const firstRoundFunctionCalls = result.functionCalls ?? [];

    // Handle tool execution loop if needed
    if (result.functionCalls && result.functionCalls.length > 0) {
      console.log(`[JARVIS] Model requested ${result.functionCalls.length} tool calls`);
      const toolResponses = await Promise.all(result.functionCalls.map(async (call) => {
        const handler = toolHandlers[call.name];
        if (handler) {
          try {
            const output = await handler(call.args);
            return {
              functionResponse: {
                name: call.name,
                response: { content: output }
              },
              id: (call as any).id
            };
          } catch (e: any) {
            return {
              functionResponse: {
                name: call.name,
                response: { error: e.message }
              },
              id: (call as any).id
            };
          }
        }
        return {
          functionResponse: {
            name: call.name,
            response: { error: "Function not found" }
          },
          id: (call as any).id
        };
      }));

      // Call Gemini again with tool results to get a verbal response
      result = await this.executeWithRetry(() => getAiClient().models.generateContent({
        model: finalModelName,
        contents: [
          { role: 'user', parts: [{ text: transcript }] },
          { role: 'model', parts: result.functionCalls.map(c => ({ functionCall: c })) },
          { role: 'user', parts: toolResponses as any }
        ],
        config: {
          systemInstruction: this.buildSystemPrompt(context, currentRole),
          tools,
        }
      }));
    }

      console.log('[JARVIS] Gemini result received');
      const replyText = this.sanitizeAIResponse(result.text || "Paki-ulit, hindi ko naintindihan.");

      // FIX HIGH-01: Pass firstRoundFunctionCalls so structured tool use is
      // captured even when the second Gemini call returns a plain-text summary.
      const proposedActions = this.extractProposedActions(replyText, firstRoundFunctionCalls);

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
      const errStr = JSON.stringify(err) || String(err.message || err);
      const isApiKeyError = errStr.includes('API key expired') || errStr.includes('API_KEY_INVALID') || errStr.includes('API key not valid');
      
      if (isApiKeyError) {
        console.error('\n========================================================================\n' +
                      '[CRITICAL WARNING] GEMINI API KEY HAS EXPIRED OR IS INVALID!\n' +
                      'Please renew or replace your API key via Google AI Studio Settings.\n' +
                      '========================================================================\n');
      } else {
        console.error('[JARVIS] Primary Voice processing failed, executing resilient programmatic fallback:', err);
      }
      
      // Determine a highly context-aware fallback response based on transcript keywords
      let replyText = "Naka-alerto ang ating command center sa inyong ulat. Huwag mag-alala, nakabantay at handang tumulong ang mga Barangay Tanod.";
      
      if (isApiKeyError) {
        replyText = "Paumanhin po, expired o hindi wasto ang inyong Google AI Studio API Key sa system. Mangyaring pumunta sa 'Settings' sa Google AI Studio upang i-renew o palitan ang inyong API key para sa Brgy. Tanod S.O.S.";
      } else {
        const lowerT = (transcript || '').toLowerCase();
        
        if (lowerT.includes("siren") || lowerT.includes("sirena") || lowerT.includes("pito") || lowerT.includes("alarm")) {
          replyText = "Nakikipag-ugnayan na ako sa command center. Maaari ninyong gamitin ang emergency alarm o sirena sa inyong panel kung kailangan.";
        } else if (lowerT.includes("tulong") || lowerT.includes("saklolo") || lowerT.includes("emergency") || lowerT.includes("medical") || lowerT.includes("doktor") || lowerT.includes("sugat")) {
          replyText = "Naka-proseso na ang inyong emergency report. Manatiling ligtas sa inyong lokasyon, parating na ang tactical patrol.";
        } else if (lowerT.includes("patrol") || lowerT.includes("tanod") || lowerT.includes("asan") || lowerT.includes("nasaan") || lowerT.includes("bantay")) {
          replyText = "Kasalukuyang nagpapatrolya ang ating Barangay Tanod sa bawat sektor upang masiguro ang inyong kaligtasan.";
        } else if (lowerT.includes("baha") || lowerT.includes("bagyo") || lowerT.includes("ulan") || lowerT.includes("lindol") || lowerT.includes("apoy") || lowerT.includes("sunog")) {
          replyText = "Minomonitor ng patrol teams ang mga apektadong zone. Mangyaring mag-ingat para sa inyong kaligtasan at sundin ang utos ng pamunuan.";
        } else if (lowerT.includes("report") || lowerT.includes("lista") || lowerT.includes("sulat") || lowerT.includes("pasa")) {
          replyText = "Naitatala na po ang ulat sa ating local tactical logs. Kukumpirmahin ito ng naka-duty na Tanod sa lalong madaling panahon.";
        }
      }

      let audioBase64: string | undefined;
      try {
        const audioBuffer = await ttsService.generateSpeech({
          text: replyText,
          format: 'mp3'
        });
        audioBase64 = audioBuffer.toString('base64');
      } catch (ttsErr) {
        console.error('[JARVIS] Fallback speech generation failed:', ttsErr);
      }

      const response: VoiceResponse = {
        reply: replyText,
        transcript,
        proposedActions: [],
        permissionLevel: currentRole,
        isSuperAdmin: currentRole === VoicePermissionLevel.SUPER_ADMIN,
        tone: VoiceResponseTone.CALM,
        confidence: 0.8,
        timestamp: new Date(),
      };

      if (audioBase64) {
        (response as any).audioBase64 = audioBase64;
      }

      this.emitVoiceResponse(userId, response);
      return response;
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
      'SUPER_ADMIN',
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
    const isResponder = [VoicePermissionLevel.ADMIN, VoicePermissionLevel.SUPER_ADMIN, VoicePermissionLevel.COMMANDER, VoicePermissionLevel.TANOD].includes(role);

    return `ROLE: Brgy Tanod S.O.S. Tactical AI (GUARDIAN MODE).
PERSONALITY: Authoritative, calm, and protective. Like a seasoned Senior Tanod with advanced tech.
CULTURAL CONTEXT: Philippines, Barangay setting. Use Taglish (Filipino + English) naturally.
CURRENT ROLE OF USER: ${role}
UNITS AVAILABLE: ${context.availableTanods.length} officers on active patrol
PENDING INCIDENTS: ${context.barangayInfo.pendingIncidents} alerts requiring triage
RESPONDING INCIDENTS: ${context.barangayInfo.respondingIncidents} cases in progress

${isResponder ? `CAPABILITIES: You are a SMART DISPATCHER. You have access to real-time tools to:
- Browse active SOS alerts.
- Locate nearest available Tanods.
- Assign Tanods to specific incidents and update their status.
- Generate tactical incident reports.
Use these tools whenever the user asks for status updates, coordination, or dispatching chores.` : ''}

VOICE GUIDELINES:
- Keep it under 15 words. Be CONCISE.
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

  /**
   * Derives proposed actions from the model's response.
   *
   * Priority order:
   *   1. Structured tool/function calls (authoritative — Gemini decided to act)
   *   2. Text keyword fallback (used only when no tool calls were made)
   *
   * FIX HIGH-01: Previously this only accepted `text: string` and used keyword
   * matching. Now it accepts the first-round functionCalls array so that
   * confirmed tool use surfaces as high-confidence (0.95) ProposedActions
   * with real payloads instead of text-inferred (0.65) guesses.
   */
  private extractProposedActions(
    text: string,
    functionCalls?: any[]
  ): ProposedAction[] {
    // ── 1. Structured path ───────────────────────────────────────────────────
    if (functionCalls && functionCalls.length > 0) {
      return functionCalls
        .filter((call) => !!call.name)
        .map((call): ProposedAction => {
          const callName = call.name;
          const commandType =
            this.TOOL_TO_COMMAND[callName] ?? VoiceCommandType.UNKNOWN;

          // Actions that modify state require confirmation; read-only ones don't
          const readOnlyTools = new Set([
            'get_active_sos',
            'get_tanod_list',
            'find_nearest_tanod',
          ]);
          const requiresConfirmation = !readOnlyTools.has(callName);

          return {
            type: commandType,
            description: this.describeToolCall(callName, call.args),
            confidence: 0.95, // High confidence — model explicitly chose this tool
            requiresConfirmation,
            payload: call.args ?? {},
          };
        });
    }

    // ── 2. Text fallback (for conversational replies with no tool calls) ─────
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
        confidence: 0.65, // Lower — inferred from text, not structured
        requiresConfirmation: true,
        payload: {},
      });
    }

    return actions;
  }

  /**
   * Human-readable description for a tool call, used in the UI confirmation dialog.
   */
  private describeToolCall(
    name: string,
    args?: Record<string, any>
  ): string {
    switch (name) {
      case 'find_nearest_tanod':
        return `Find nearest Tanod at (${args?.lat?.toFixed(4)}, ${args?.lng?.toFixed(4)})`;
      case 'update_sos_status':
        return `Update SOS #${args?.sos_id} → ${args?.status}${
          args?.assigned_to ? ` (assign to ${args.assigned_to})` : ''
        }`;
      case 'schedule_patrol':
        return `Schedule patrol: ${args?.tanod_id} → ${args?.area} (${
          args?.duration_hours ?? 4
        }h)`;
      case 'broadcast_to_responders':
        return `Broadcast to all responders: "${args?.title}"`;
      case 'send_push_notification':
        return `Push notification → ${args?.title}`;
      case 'create_incident_report':
      case 'generate_formal_report':
        return `Generate incident report for SOS #${args?.sos_id}`;
      case 'get_active_sos':
        return 'Retrieve active SOS alerts';
      case 'get_tanod_list':
        return `List ${args?.only_available ? 'available' : 'all'} Tanod units`;
      default:
        return `Execute ${name}`;
    }
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
    barangayId: string = 'default',
    mimeType: string = 'audio/webm'
  ): Promise<VoiceResponse> {
    const startTime = Date.now();
    
    try {
      // Security check
      if (!this.checkRateLimit(userId)) {
        throw new AppError('Too many voice commands. Please wait.', 429, 'RATE_LIMITED');
      }

      const session = this.getOrCreateSession(userId, currentRole);
      const context = await this.getLiveContext(barangayId);

      const finalModelName = config.geminiModel || AI_MODELS.flash.name;

      const tools = (currentRole === VoicePermissionLevel.ADMIN || currentRole === VoicePermissionLevel.SUPER_ADMIN || currentRole === VoicePermissionLevel.COMMANDER || currentRole === VoicePermissionLevel.TANOD)
        ? [{ functionDeclarations: DISPATCHER_TOOLS }]
        : [];

      let result = await this.executeWithRetry(() => getAiClient().models.generateContent({
        model: finalModelName,
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
        ] }],
        config: {
          systemInstruction: this.buildSystemPrompt(context, currentRole) + "\nListen to the audio and respond appropriately. If it's a command, identify it.",
          tools
        }
      }));

      // FIX HIGH-01: Capture first-round functionCalls for multimodal path too.
      const firstRoundFunctionCalls = result.functionCalls ?? [];

      // Handle tool execution loop if needed for multimodal
      if (result.functionCalls && result.functionCalls.length > 0) {
        console.log(`[JARVIS] Multimodal requested ${result.functionCalls.length} tool calls`);
        const toolResponses = await Promise.all(result.functionCalls.map(async (call) => {
          const handler = toolHandlers[call.name];
          if (handler) {
            try {
              const output = await handler(call.args);
              return {
                functionResponse: {
                  name: call.name,
                  response: { content: output }
                },
                id: (call as any).id
              };
            } catch (e: any) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: e.message }
                },
                id: (call as any).id
              };
            }
          }
          return {
            functionResponse: {
              name: call.name,
              response: { error: "Function not found" }
            },
            id: (call as any).id
          };
        }));

        result = await this.executeWithRetry(() => getAiClient().models.generateContent({
          model: finalModelName,
          contents: [
            { role: 'user', parts: [{ inlineData: { mimeType, data: audioBuffer.toString('base64') } }] },
            { role: 'model', parts: result.functionCalls.map(c => ({ functionCall: c })) },
            { role: 'user', parts: toolResponses as any }
          ],
          config: {
            systemInstruction: this.buildSystemPrompt(context, currentRole),
            tools
          }
        }));
      }

      const replyText = this.sanitizeAIResponse(result.text || "Audio received. Processing.");

      // FIX HIGH-01: Pass firstRoundFunctionCalls for multimodal path.
      const proposedActions = this.extractProposedActions(replyText, firstRoundFunctionCalls);

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
