// src/server/services/anomalyDetectionService.ts
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';
import { pool } from '../db/index';
import { logger } from '../utils/logger';

const auditLogRepository = new AuditLogRepository();

interface UserBehaviorProfile {
  adminId: string;
  baseline: {
    commandsPerHour: number;
    avgCommandLength: number;
    commonActions: string[];
    activeHours: number[]; // 0-23
    typicalIncidentTypes: string[];
    lastCalculated?: Date;
  };
  currentSession: {
    commandCount: number;
    startTime: Date;
    actions: Array<{ timestamp: Date; command: string; type: string }>;
  };
  riskScore: number;
}

export class AnomalyDetectionService {
  private profiles = new Map<string, UserBehaviorProfile>();

  async evaluateCommand(adminId: string, transcript: string, commandType: string = 'GENERAL') {
    const profile = await this.getOrCreateProfile(adminId);
    const now = new Date();

    // Update session stats
    profile.currentSession.commandCount++;
    profile.currentSession.actions.push({
      timestamp: now,
      command: transcript,
      type: commandType
    });

    let riskScore = 0;

    // === 1. Temporal Anomaly ===
    const hour = now.getHours();
    if (!profile.baseline.activeHours.includes(hour)) {
      riskScore += 25; // Unusual time
    }

    // === 2. Volume Anomaly ===
    const commandsThisHour = this.countCommandsInWindow(profile, 60 * 60 * 1000);
    if (commandsThisHour > profile.baseline.commandsPerHour * 2.5) {
      riskScore += 30;
    }

    // === 3. Semantic / Keyword Anomaly ===
    const semanticRisk = this.detectSemanticAnomaly(transcript);
    riskScore += semanticRisk;

    // === 4. Command Pattern Deviation ===
    const deviation = this.calculatePatternDeviation(profile, transcript);
    riskScore += deviation;

    // === 5. Session Context Anomaly ===
    if (profile.currentSession.commandCount > 25 && 
        (Date.now() - profile.currentSession.startTime.getTime()) < 15 * 60 * 1000) {
      riskScore += 20; // Too fast
    }

    profile.riskScore = Math.min(100, riskScore);

    // === Response Based on Risk ===
    if (riskScore >= 70) {
      await this.triggerHighRiskResponse(adminId, transcript, riskScore);
    } else if (riskScore >= 40) {
      await this.triggerMediumRiskResponse(adminId, transcript, riskScore);
    }

    return { riskScore, profile };
  }

  private async getOrCreateProfile(adminId: string): Promise<UserBehaviorProfile> {
    if (!this.profiles.has(adminId)) {
      // Create initial DB check table if possible (fallback system_config)
      let baselineData: any = null;
      try {
        const res = await pool.query("SELECT data FROM system_config WHERE key = $1", [`baseline_${adminId}`]);
        if (res.rows.length > 0) {
          baselineData = res.rows[0].data;
        }
      } catch (e) {
        logger.warn("Could not fetch baseline from DB", e);
      }

      this.profiles.set(adminId, {
        adminId,
        baseline: baselineData || {
          commandsPerHour: 15,
          avgCommandLength: 45,
          commonActions: ['check incidents', 'dispatch', 'status update'],
          activeHours: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
          typicalIncidentTypes: ['CRIME', 'MEDICAL', 'FIRE'],
          lastCalculated: new Date()
        },
        currentSession: {
          commandCount: 0,
          startTime: new Date(),
          actions: []
        },
        riskScore: 0
      });
    }
    return this.profiles.get(adminId)!;
  }

  async recalculateBaseline(adminId: string) {
    const profile = await this.getOrCreateProfile(adminId);
    
    // In a full implementation, this calculates average commands/hour, command patterns from audit log table
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM audit_logs WHERE citizen_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [adminId]
    );
    const count = parseInt(result.rows[0].count || '0', 10);
    const newCommandsPerHour = Math.max(10, Math.round(count / (7 * 24))); // minimum 10

    profile.baseline.commandsPerHour = newCommandsPerHour;
    profile.baseline.lastCalculated = new Date();

    try {
      await pool.query(
        "INSERT INTO system_config (key, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = now()",
        [`baseline_${adminId}`, JSON.stringify(profile.baseline)]
      );
    } catch (e) {
      logger.warn("Failed to persist new baseline", e);
    }
    
    return profile.baseline;
  }

  private detectSemanticAnomaly(text: string): number {
    const dangerousPatterns = [
      /ignore previous|new instructions|jailbreak|override/i,
      /delete all|remove|ban|shutdown|export data/i,
      /give me admin|full access|change password/i
    ];
    return dangerousPatterns.some(p => p.test(text)) ? 60 : 0;
  }

  private calculatePatternDeviation(profile: UserBehaviorProfile, transcript: string): number {
    const lower = transcript.toLowerCase();
    const matchesCommon = profile.baseline.commonActions.some(action => 
      lower.includes(action.toLowerCase())
    );
    return matchesCommon ? 0 : 15;
  }

  private countCommandsInWindow(profile: UserBehaviorProfile, ms: number): number {
    const cutoff = Date.now() - ms;
    return profile.currentSession.actions.filter(a => a.timestamp.getTime() > cutoff).length;
  }

  private async triggerHighRiskResponse(adminId: string, command: string, score: number) {
    await auditLogRepository.create({
      type: 'ANOMALY_HIGH_RISK',
      citizen_id: adminId,
      notes: `Risk ${score}: ${command}`
    });

    getIO().to(`admin_${adminId}`).emit('voice-anomaly', {
      level: 'HIGH',
      message: "Unusual activity detected. Please verify your identity or contact security.",
      command,
      riskScore: score
    });

    getIO().to(`admin_${adminId}`).emit('voice-pause', { reason: 'anomaly' });
  }

  private async triggerMediumRiskResponse(adminId: string, command: string, score: number) {
    getIO().to(`admin_${adminId}`).emit('voice-anomaly', {
      level: 'MEDIUM',
      message: "Please confirm this command.",
      command,
      riskScore: score
    });
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
