import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from '../config/index';
import {
  routeToModel,
  shouldUpgradeModel,
  AI_MODELS,
  type AITier,
  type ModelConfig,
} from '../config/aiModels';

let ai: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY_NEW or GEMINI_API_KEY (Free Tier) is required for server-side AI');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// =============================================================================
// Schema
// =============================================================================
const AIAnalysisSchema = z.object({
  incidentType: z.enum(["MEDICAL", "FIRE", "CRIME", "DISTURBANCE", "NATURAL_DISASTER", "OTHER"]),
  severityScore: z.number().int().min(1).max(10),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  summary: z.string().min(5).max(280),
  recommendedResponders: z.array(z.string()),
  riskFactors: z.array(z.string()),
  estimatedResponseTimeMins: z.number().int().min(1).max(60),
  actionRecommendations: z.array(z.string()),
  broadcastRecommendation: z.object({
    shouldBroadcast: z.boolean(),
    message: z.string().optional(),
    reason: z.string().optional()
  }).optional()
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// =============================================================================
// Logger
// =============================================================================
const log = {
  info:  (msg: string, meta?: any) => console.info(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn:  (msg: string, meta?: any) => console.warn(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

// =============================================================================
// Fallback
// =============================================================================
function createFallbackAnalysis(description: string, initialType?: string): AIAnalysis {
  return {
    incidentType: (initialType?.toUpperCase() as any) || "OTHER",
    severityScore: 5,
    urgency: "HIGH",
    summary: description.length > 100 ? description.substring(0, 97) + "..." : description,
    recommendedResponders: ["Tanod Team"],
    riskFactors: ["AI analysis unavailable — manual assessment required"],
    estimatedResponseTimeMins: 15,
    actionRecommendations: [
      "Dispatch nearest available Tanod immediately",
      "Maintain communication with reporter",
      "Prepare for possible escalation",
    ],
  };
}

// =============================================================================
// Core: call one model with timeout
// =============================================================================
async function callModel(
  modelConfig: ModelConfig,
  prompt: string,
  requestId: string
): Promise<AIAnalysis> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Model timeout after ${modelConfig.timeoutMs}ms`)), modelConfig.timeoutMs)
  );

  const callPromise = (async () => {
    const result = await getAIClient().models.generateContent({
      model: modelConfig.name,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: modelConfig.maxOutputTokens,
        temperature: 0.2,
      },
    });

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return AIAnalysisSchema.parse(parsed);
  })();

  return Promise.race([callPromise, timeoutPromise]);
}

// =============================================================================
// Main export — with automatic routing + upgrade on underestimate
// =============================================================================
export async function analyzeIncident(
  description: string,
  initialType?: string,
  nearestTanodDistanceKm?: number,
  incidentId?: string
): Promise<AIAnalysis & { _modelUsed: string; _tier: AITier }> {

  const requestId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();

  if (!description?.trim()) {
    log.warn("Empty description received", { requestId, incidentId });
    return { ...createFallbackAnalysis("No description provided", initialType), _modelUsed: 'none', _tier: 'flash' };
  }

  // Sanitize
  const sanitized = description
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s.,!?;:()\-]/g, '')
    .substring(0, 1000)
    .trim();

  const jsonSafeDescription = JSON.stringify(sanitized);

  const prompt = buildPrompt(jsonSafeDescription, initialType, nearestTanodDistanceKm);

  // === Step 1: Route to initial model ===
  const initialModel = routeToModel({
    incidentType: initialType?.toUpperCase(),
    descriptionLength: sanitized.length,
  });

  log.info("Routing decision", {
    requestId,
    incidentId,
    selectedTier: initialModel.tier,
    selectedModel: initialModel.name,
    reason: `type=${initialType}, descLen=${sanitized.length}`,
  });

  let result: AIAnalysis;
  let usedModel = initialModel;

  try {
    result = await callModel(initialModel, prompt, requestId);

    // === Step 2: Check if result severity is higher than we expected ===
    const upgrade = shouldUpgradeModel(initialModel.tier, result.severityScore, result.urgency);

    if (upgrade) {
      log.warn("Upgrading model — initial result indicates higher severity than routed tier", {
        requestId,
        incidentId,
        from: initialModel.tier,
        to: upgrade.tier,
        severityScore: result.severityScore,
        urgency: result.urgency,
      });

      try {
        const upgradedResult = await callModel(upgrade, prompt, requestId);
        result = upgradedResult;
        usedModel = upgrade;
      } catch (upgradeErr: any) {
        log.warn("Upgrade model call failed, keeping initial result", {
          requestId,
          error: upgradeErr.message,
        });
        // Keep the original result — don't fall back to dummy
      }
    }

    log.info("Analysis complete", {
      requestId,
      incidentId,
      model: usedModel.name,
      tier: usedModel.tier,
      severity: result.severityScore,
      urgency: result.urgency,
      durationMs: Date.now() - startTime,
    });

    return { ...result, _modelUsed: usedModel.name, _tier: usedModel.tier };

  } catch (err: any) {
    log.error("AI analysis failed", {
      requestId,
      incidentId,
      model: usedModel.name,
      error: err.message,
      durationMs: Date.now() - startTime,
    });

    // === Step 3: If chosen model failed, try flash as last resort ===
    if (initialModel.tier !== 'flash') {
      log.warn("Primary model failed, falling back to flash", { requestId });
      try {
        const flashResult = await callModel(AI_MODELS.flash, prompt, requestId);
        return { ...flashResult, _modelUsed: AI_MODELS.flash.name, _tier: 'flash' };
      } catch {
        // Flash also failed — use static fallback
      }
    }

    return { ...createFallbackAnalysis(sanitized, initialType), _modelUsed: 'fallback', _tier: 'flash' };
  }
}

// =============================================================================
// Prompt builder (separated for clarity)
// =============================================================================
function buildPrompt(
  description: string,
  initialType?: string,
  nearestTanodDistanceKm?: number
): string {
  return `You are an expert AI emergency triage coordinator for a Philippine Barangay Tanod system (Brgy. Tanod S.O.S.).
Your primary task is to analyze incoming disaster, neighborhood security, medical, and public disturbance reports from residents. 
Specifically, you must:
1. Carefully analyze the incident report to determine the most accurate incident type.
2. Evaluate the severity of the situation and assign a severity score from 1 (lowest) to 10 (highest), considering local context such as potential for escalation, danger to life, and resource demands.
3. Recommend appropriate, actionable responses.

Be proactive, authoritative, concise, and context-aware. Consider local factors typical in Philippine barangays such as narrow streets/accessibility, localized hazards (flooding, fires), and common neighborhood disputes.

Analyze this incident report and respond with ONLY a valid JSON object — no markdown, no explanation.

Incident Description: ${description}
${initialType ? `Initial Type: ${initialType}` : ''}
${nearestTanodDistanceKm !== undefined ? `Nearest Tanod Distance: ${nearestTanodDistanceKm.toFixed(2)} km` : ''}

Required JSON format:
{
  "incidentType": "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER",
  "severityScore": 1-10,
  "urgency": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
  "summary": "max 280 chars",
  "recommendedResponders": ["string"],
  "riskFactors": ["string"],
  "estimatedResponseTimeMins": 1-60,
  "actionRecommendations": ["string"],
  "broadcastRecommendation": {
    "shouldBroadcast": boolean,
    "message": "string",
    "reason": "string"
  }
}`;
}
