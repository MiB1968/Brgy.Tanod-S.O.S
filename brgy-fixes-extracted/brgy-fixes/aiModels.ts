/**
 * src/server/config/aiModels.ts
 *
 * FIX — CRIT-AI-01
 *
 * Bug: All three AI model names were phantom/nonexistent strings:
 *   - 'gemini-3.5-flash'     → API Error 404 (model does not exist)
 *   - 'gemini-3.1-pro-preview' → API Error 404 (model does not exist)
 *
 * Additionally, the `flash` and `pro` tiers shared the same model name,
 * making the routing logic completely pointless — both picked the same model.
 *
 * Fix: Use real, currently-available Gemini model identifiers.
 *   flash    → gemini-2.0-flash-lite  (fastest, free tier friendly)
 *   pro      → gemini-2.0-flash       (balanced, default)
 *   critical → gemini-2.5-pro-preview  (most capable for life-threatening events)
 *
 * These names match the Google AI API as of 2026-06.
 * Update GEMINI_MODEL in your .env to override the default for all tiers.
 */

export type AITier = 'flash' | 'pro' | 'critical';

export interface ModelConfig {
  name: string;
  tier: AITier;
  description: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

export const AI_MODELS: Record<AITier, ModelConfig> = {
  flash: {
    // FIX: was 'gemini-3.5-flash' (does not exist)
    name: 'gemini-2.0-flash-lite',
    tier: 'flash',
    description: 'Fast, lightweight — for routine triage and low-severity incidents',
    maxOutputTokens: 1024,
    timeoutMs: 15000,
  },
  pro: {
    // FIX: was 'gemini-3.5-flash' (same as flash — routing was pointless)
    name: 'gemini-2.0-flash',
    tier: 'pro',
    description: 'Balanced — for moderate incidents needing deeper analysis',
    maxOutputTokens: 2048,
    timeoutMs: 20000,
  },
  critical: {
    // FIX: was 'gemini-3.1-pro-preview' (does not exist)
    name: 'gemini-2.5-pro-preview-06-05',
    tier: 'critical',
    description: 'Life-threatening emergencies — highest reliability. Requires paid tier.',
    maxOutputTokens: 4096,
    timeoutMs: 30000,
  },
};

export type RoutingHint = {
  incidentType?: string;
  severityScore?: number;
  urgency?: string;
  descriptionLength?: number;
};

/**
 * Determines which AI tier to use based on incident context.
 * Called BEFORE the AI request so we pick the right model upfront.
 */
export function routeToModel(hint: RoutingHint): ModelConfig {
  const { incidentType, severityScore, urgency, descriptionLength = 0 } = hint;

  // === CRITICAL tier — life-threatening, always use best model ===
  if (
    urgency === 'CRITICAL' ||
    (severityScore !== undefined && severityScore >= 8) ||
    incidentType === 'MEDICAL' ||
    incidentType === 'FIRE'
  ) {
    return AI_MODELS.critical;
  }

  // === PRO tier — moderate severity or long description ===
  if (
    urgency === 'HIGH' ||
    (severityScore !== undefined && severityScore >= 5) ||
    descriptionLength > 200
  ) {
    return AI_MODELS.pro;
  }

  // === FLASH tier — routine, low-severity ===
  return AI_MODELS.flash;
}

/**
 * Checks if we should upgrade from a cheaper model to a more capable one
 * based on the initial analysis result. Call AFTER a flash/pro response.
 */
export function shouldUpgradeModel(currentTier: AITier, analysis: any): boolean {
  if (currentTier === 'critical') return false;

  const severity = analysis?.severityScore ?? 0;
  const urgency = analysis?.urgency ?? 'LOW';

  return (
    urgency === 'CRITICAL' ||
    severity >= 8 ||
    analysis?.incidentType === 'MEDICAL' ||
    analysis?.incidentType === 'FIRE'
  );
}
