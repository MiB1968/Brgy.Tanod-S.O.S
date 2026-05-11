// src/server/services/anomalyDetectionService.ts
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';
import { AppError } from '../middleware/error';
import { getIO } from '../sockets';

const auditLogRepository = new AuditLogRepository();

interface UserBehaviorProfile {
  adminId: string;
  baseline: {
    commandsPerHour: number;
    avgCommandLength: number;
    commonActions: string[];
    activeHours: number[]; // 0-23
    typicalIncidentTypes: string[];
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
  private globalThreatIndicators = new Set<string>();

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
      riskScore += 25; // Unusual time (e.g., 3 AM)
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
      // In production, load from database (historical behavior)
      this.profiles.set(adminId, {
        adminId,
        baseline: {
          commandsPerHour: 12,
          avgCommandLength: 45,
          commonActions: ['check incidents', 'dispatch', 'status update'],
          activeHours: [7,8,9,10,11,12,13,14,15,16,17,18,19,20],
          typicalIncidentTypes: ['crime', 'medical', 'fire']
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

  private detectSemanticAnomaly(text: string): number {
    const dangerousPatterns = [
      /ignore previous|new instructions|jailbreak|override/i,
      /delete all|remove|ban|shutdown|export data/i,
      /give me admin|full access|change password/i
    ];
    return dangerousPatterns.some(p => p.test(text)) ? 60 : 0;
  }

  private calculatePatternDeviation(profile: UserBehaviorProfile, transcript: string): number {
    // Simple Levenshtein or keyword mismatch scoring
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

    // Optional: Force session pause
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
