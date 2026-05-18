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
    name: 'gemini-1.5-flash',
    tier: 'flash',
    description: 'Fast, lightweight — for routine triage and low-severity incidents',
    maxOutputTokens: 1024,
    timeoutMs: 15000,
  },
  pro: {
    name: 'gemini-1.5-pro',
    tier: 'pro',
    description: 'Balanced — for moderate incidents needing deeper analysis',
    maxOutputTokens: 2048,
    timeoutMs: 20000,
  },
  critical: {
    name: 'gemini-1.5-pro',
    tier: 'critical',
    description: 'Life-threatening emergencies — high reliability',
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

  // === PRO tier — moderate complexity ===
  if (
    urgency === 'HIGH' ||
    (severityScore !== undefined && severityScore >= 5) ||
    incidentType === 'CRIME' ||
    incidentType === 'NATURAL_DISASTER' ||
    descriptionLength > 300
  ) {
    return AI_MODELS.pro;
  }

  // === FLASH tier — everything else ===
  return AI_MODELS.flash;
}

/**
 * After AI returns a result, re-evaluate if we should have used a better model.
 * Returns upgraded model if the result suggests higher severity than expected.
 */
export function shouldUpgradeModel(
  usedTier: AITier,
  resultSeverity: number,
  resultUrgency: string
): ModelConfig | null {
  if (usedTier === 'critical') return null; // already at max

  const needsUpgrade =
    resultSeverity >= 8 ||
    resultUrgency === 'CRITICAL' ||
    (usedTier === 'flash' && resultSeverity >= 5);

  if (needsUpgrade) {
    const upgradeTo = resultSeverity >= 8 ? 'critical' : 'pro';
    if (upgradeTo !== usedTier) {
      return AI_MODELS[upgradeTo];
    }
  }

  return null;
}
