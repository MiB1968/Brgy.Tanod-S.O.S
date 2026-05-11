// src/server/services/voiceBiometricsService.ts
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';

const auditLogRepository = new AuditLogRepository();

/**
 * VoiceBiometricsService
 *
 * STATUS: SCAFFOLD — real speaker verification not yet implemented.
 *
 * The previous version had a hardcoded matchScore = 0.92 that always
 * returned true. That was removed because fake security is worse than
 * no security — it creates false confidence.
 *
 * Current behavior:
 *   - enrollVoice() → stores a placeholder, logs the attempt
 *   - verifyVoice() → returns FALSE (fails closed, not open)
 *   - isEnrolled()  → checks placeholder map only
 *
 * When to implement real biometrics:
 *   Use the ElevenLabs Speaker Verification API (when available in your
 *   plan) or a self-hosted solution like resemblyzer (Python) or
 *   pyannote.audio. Wire it in by replacing the body of verifyVoice().
 *
 * Until then, critical voice actions are protected by JWT role checks
 * in voiceAssistantService.ts — that is real security.
 */
export class VoiceBiometricsService {
  // In-memory map of enrolled admin IDs → placeholder voice print ID
  // Replace with DB-backed storage when implementing real biometrics
  private enrolledAdmins = new Map<string, { voicePrintId: string; enrolledAt: Date }>();

  /**
   * Enroll a voice sample for an admin.
   * Currently stores a placeholder. Does NOT call any external API.
   */
  async enrollVoice(
    adminId: string,
    _audioSamples: Buffer[],
    name: string
  ): Promise<{ success: boolean; voicePrintId: string; message: string }> {
    const voicePrintId = `placeholder_${adminId}_${Date.now()}`;

    this.enrolledAdmins.set(adminId, {
      voicePrintId,
      enrolledAt: new Date(),
    });

    await auditLogRepository.create({
      type: 'VOICE_BIOMETRIC_ENROLL',
      citizen_id: adminId,
      notes: `Voice enrollment placeholder created for "${name}". Real biometrics not yet active.`,
    });

    console.log(`[Biometrics] Placeholder enrollment created for admin ${adminId}`);

    return {
      success: true,
      voicePrintId,
      message: 'Voice profile saved. Note: real speaker verification is not yet active.',
    };
  }

  /**
   * Verify a voice sample against enrolled profile.
   *
   * CURRENT BEHAVIOR: Always returns false (fails closed).
   * This means critical actions gated on biometrics will be blocked
   * until real verification is implemented — which is the safe default.
   *
   * The voiceAssistantService.ts no longer calls this for critical actions.
   * Instead it uses JWT role checks. This method is kept as a scaffold.
   */
  async verifyVoice(adminId: string, _audioBuffer: Buffer): Promise<boolean> {
    const enrolled = this.enrolledAdmins.get(adminId);

    await auditLogRepository.create({
      type: 'VOICE_BIOMETRIC_VERIFY',
      citizen_id: adminId,
      notes: enrolled
        ? 'Verification attempted — real biometrics not active, denied.'
        : 'Verification attempted — user not enrolled, denied.',
    });

    console.warn(
      `[Biometrics] verifyVoice called for ${adminId} — real speaker verification not implemented. Returning false.`
    );

    // SECURITY: Fail closed. Always deny until real biometrics are wired in.
    return false;
  }

  isEnrolled(adminId: string): boolean {
    return this.enrolledAdmins.has(adminId);
  }

  getEnrollmentInfo(adminId: string) {
    return this.enrolledAdmins.get(adminId) || null;
  }
}

export const voiceBiometricsService = new VoiceBiometricsService();
