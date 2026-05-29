import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { config } from '../config/index';
import {
  routeToModel,
  shouldUpgradeModel,
  AI_MODELS,
  type AITier,
  type ModelConfig,
} from '../config/aiModels';

import { BARANGAY_PROTOCOLS } from "../../data/barangayProtocols";

let ai: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY_NEW or GEMINI_API_KEY (Free Tier) is required for server-side AI');
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
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

function logAIError(contextMsg: string, err: any, meta: any = {}) {
  const errMsg = err.message || String(err);
  if (errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key') || errMsg.includes('INVALID_ARGUMENT')) {
    log.warn(`${contextMsg} (Gemini API key is unconfigured, invalid, or expired. Please check or renew the key in Settings.)`, {
      ...meta,
      errorSnippet: errMsg.substring(0, 200)
    });
  } else {
    log.error(`${contextMsg} failed`, {
      ...meta,
      error: errMsg
    });
  }
}

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
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const raw = result.text;
    if (!raw) throw new Error("Empty AI response");
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
    logAIError("AI analysis failed", err, {
      requestId,
      incidentId,
      model: usedModel.name,
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

/**
 * Brgy SOS Guardian - Voice Assistant Responder
 */
export async function getGuardianResponse(userText: string): Promise<string> {
  const requestId = `guardian_${Date.now()}`;
  
  if (!userText?.trim()) return "Nakinig ako. May maibibigay ba akong tulong sa inyo?";

  try {
    const finalModelName = config.geminiModel || AI_MODELS.flash.name;
    
    // RAG context retrieval
    const lowerQuery = userText.toLowerCase();
    const matches: string[] = [];
    for (const item of BARANGAY_PROTOCOLS) {
      const isMatch = item.keywords.some(keyword => lowerQuery.includes(keyword)) ||
                      item.title.toLowerCase().includes(lowerQuery);
      if (isMatch) {
         matches.push(`[${item.title.toUpperCase()}]\n${item.content}`);
      }
    }
    const context = matches.length > 0 ? `Official Barangay Protocols:\n${matches.join("\n\n")}` : "";

    const prompt = `Act as Brgy SOS Guardian, a helpful emergency coordinator for a Philippine Barangay. 
    User says (in Tagalog/English): "${userText}"
    
    ${context ? `Use the following official protocols to guide your answer accurately:\n${context}` : 'Answer based on general emergency coordination best practices.'}
    
    Give a CALM, EMPOWERING, 1-to-2 sentence response. 
    If they are reporting an emergency, confirm alert is processed. 
    If they are asking for status, say the team is coordinating. 
    Use a mix of Tagalog and English (Taglish) if appropriate for a local feel.
    Respond with ONLY the text of your response.`;

    const result = await getAIClient().models.generateContent({
      model: finalModelName,
      contents: prompt
    });
    return result.text?.trim() || "";
  } catch (err: any) {
    logAIError("Guardian AI response failed", err, { requestId });
    return "Nakatanggap ako ng ulat. Huwag mag-alala, nakikipag-ugnayan na ang ating patrol unit. Stay safe.";
  }
}

// =============================================================================
// Summarization
// =============================================================================
export async function summarizeIncident(incidentNotes: string): Promise<string> {
  if (!incidentNotes?.trim()) return "No incident notes available.";
  
  try {
    const prompt = `Summarize this emergency incident in 3 concise sentences.
Do not include names, phone numbers, or addresses.

Incident:
${incidentNotes}`;

    const result = await getAIClient().models.generateContent({
      model: config.geminiModel || AI_MODELS.flash.name,
      contents: prompt
    });
    return result.text?.trim() || "Summary unavailable.";
  } catch (err: any) {
    logAIError("AI Summarization failed, falling back to programmatic snippet", err);
    // Smart fallback: Extract the first few logical phrases as a summary
    const cleanNotes = incidentNotes.replace(/[\r\n]+/g, ' ').trim();
    const sentences = cleanNotes.split(/[.!?]\s+/).filter(Boolean);
    if (sentences.length > 0) {
      return sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '.');
    }
    return "Sumasailalim sa pagsusuri ang ulat tungkol sa emergency incident na ito.";
  }
}

// =============================================================================
// Report Drafting
// =============================================================================
export async function draftReport(roughNotes: string, date: string = new Date().toLocaleDateString()): Promise<string> {
  if (!roughNotes?.trim()) return "No rough notes available.";

  try {
    const prompt = `Draft a formal, professional Barangay Spot Report based on the following rough notes from a Tanod responder.
Do NOT output any markdown, JSON, or XML. Just the plain text report.
The report should be structured professionally.
Use the date: ${date}

Rough Notes:
${roughNotes}

Output the draft report below:`;

    const result = await getAIClient().models.generateContent({
      model: config.geminiModel || AI_MODELS.flash.name,
      contents: prompt
    });
    return result.text?.trim() || "Drafting unavailable.";
  } catch (err: any) {
    logAIError("AI Report Drafting failed, falling back to report template", err);
    // Programmatic template fallback
    return `========================================
BARANGAY TACTICAL SPOT REPORT
========================================
Petsa ng Ulat: ${date}
Sektor: Barangay Emergency Response Unit (Brgy SOS)
Katayuan: Opisyal na Draft ng Tactical Unit

MGA AKTWAL NA DETALYE AT NOTA:
----------------------------------------
${roughNotes}
----------------------------------------

MGA INIREREKOMENDANG SUSUNOD NA HAKBANG:
1. Ipaalam ang mga konkretong detalye sa Barangay Captain o Officer of the Day.
2. I-archive ang ulat sa lokal na database ng Barangay Tanod Command.
3. Panatilihin ang monitoring sa kinaroroonan ng insidente para sa kaligtasan ng publiko.

Iniulat ni: Duty Incident Responder, Brgy SOS`;
  }
}

// =============================================================================
// Translation
// =============================================================================
export async function translateText(text: string, targetLanguage: string = "English"): Promise<string> {
  if (!text?.trim()) return "";

  try {
    const prompt = `Translate the following text to ${targetLanguage}.
If the text contains sensitive IDs, phone numbers, or exact personal identifiers, strip them out before outputting the translation.
Respond ONLY with the translated text.

Text:
"${text}"`;

    const result = await getAIClient().models.generateContent({
      model: config.geminiModel || AI_MODELS.flash.name,
      contents: prompt
    });
    return result.text?.trim() || text; // Fallback to original text if translation fails to return anything
  } catch (err: any) {
    logAIError("AI Translation failed, keeping original", err);
    return text;
  }
}

// =============================================================================
// Assistant Chat (RAG-like)
// =============================================================================
export async function askAssistant(query: string): Promise<{ answer: string, needsEscalation: boolean }> {
  if (!query?.trim()) return { answer: "Please ask a question.", needsEscalation: false };

  try {
    const prompt = `You are a Barangay Assistant support bot answering questions for a community in the Philippines.
Answer based on typical generic barangay policies (ordinances, evacuation plans, hotlines, permit types).

CRITICAL RULE: If the user indicates an immediate emergency (e.g. asking for help with domestic abuse, assault, find a bomb, someone with a weapon, fire breaking out, active distress), you MUST set "needsEscalation" to true. Do not give an answer, just acknowledge the emergency and that they should be escalated.

Respond with ONLY a valid JSON object in this format:
{
  "answer": "string (the answer or emergency acknowledgement)",
  "needsEscalation": boolean
}

User Query:
"${query}"`;

    const result = await getAIClient().models.generateContent({
      model: config.geminiModel || AI_MODELS.flash.name,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const raw = result.text;
    if (!raw) throw new Error("Empty response");
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    return {
      answer: parsed.answer || "I'm not sure.",
      needsEscalation: !!parsed.needsEscalation
    };
  } catch (err: any) {
    logAIError("AI Assistant failed, activating smart local rule-engine", err);
    
    // Provide an exceptionally smart, helpful fallback answer based on Philippines barangay context keywords
    let answer = "Naka-offline po ang ating advanced AI answering module sa ngayon dahil sa system update. Mangyaring sumangguni sa opisyal ng barangay para sa direktang tulong.";
    let needsEscalation = false;
    const lowerQ = query.toLowerCase();
    
    if (lowerQ.includes("sunog") || lowerQ.includes("fire") || lowerQ.includes("saksak") || lowerQ.includes("nakaw") || lowerQ.includes("tulong") || lowerQ.includes("emergency") || lowerQ.includes("hospital") || lowerQ.includes("medical") || lowerQ.includes("atake")) {
      answer = "Ulat ng Emergency: Naka-detect kami ng emergency keyword sa inyong mensahe. Mangyaring lumikas sa ligtas na lugar kagyat o gumamit ng Emergency Alarm sa inyong dashboard upang mapa-dispatch agad ang aming Barangay Tanod Crew.";
      needsEscalation = true;
    } else if (lowerQ.includes("permit") || lowerQ.includes("clearance") || lowerQ.includes("id") || lowerQ.includes("dokumento")) {
      answer = "Para sa Barangay Clearance, Barangay ID, o Resident Permit, ikaw ay malugod na inaanyayahang pumunta sa ating Barangay Hall mula Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM. Magdala lamang ng Proof of Residency (gaya ng utility bill) at valid identification card.";
    } else if (lowerQ.includes("evac") || lowerQ.includes("baha") || lowerQ.includes("bagyo") || lowerQ.includes("ulan") || lowerQ.includes("evacuation") || lowerQ.includes("lilikas")) {
      answer = "Kaugnay ng evac at banta ng kalamidad: Ang opisyal na evacuation centers ng ating Barangay ay nakatalaga sa Barangay Gym at sa High School covered court. Siguraduhing dala ninyo ang inyong emergency kit o E-Go Bag.";
    } else if (lowerQ.includes("hotline") || lowerQ.includes("numero") || lowerQ.includes("telepono") || lowerQ.includes("number") || lowerQ.includes("tawag")) {
      answer = "Maaari po ninyong tawagan ang national emergencies sa 911 (Police/BFP) o gamitin ang ating Barangay Directory tab upang tawagan ang direktang duty patrol line ng Barangay Tanod Command Post.";
    } else if (lowerQ.includes("bata") || lowerQ.includes("kurba") || lowerQ.includes("curfew") || lowerQ.includes("oras")) {
      answer = "Ang curfew hours para sa mga kabataan o menor de edad sa ating Barangay ay nagsisimula mula 10:00 PM hanggang 4:00 AM kinabukasan alinsunod sa umiiral na ordinansa, upang mapanatiling payapa at ligtas ang ating kalsada.";
    }

    return { answer, needsEscalation };
  }
}

// =============================================================================
// Rules-Based fallback for Tactical Briefing (when API key is expired or inactive)
// =============================================================================
export function generateRuleBasedIntelligenceBrief(stats: any): string {
  const overview = stats?.overview || {};
  const alertsByType = stats?.alertsByType || [];

  const activeAlerts = overview.active_alerts ?? 0;
  const totalTanods = overview.total_tanods ?? 0;
  
  // Calculate total alerts and find top type
  let totalAlerts = 0;
  let topType = 'OTHER';
  let topCount = 0;
  
  if (Array.isArray(alertsByType) && alertsByType.length > 0) {
    alertsByType.forEach((item: any) => {
      const cnt = Number(item.count || 0);
      totalAlerts += cnt;
      if (cnt > topCount) {
        topCount = cnt;
        topType = item.type || 'OTHER';
      }
    });
  }

  // Type translation map to taglish terms
  const typeMap: Record<string, string> = {
    'MEDICAL': 'medical emergencies',
    'FIRE': 'insidente ng sunog',
    'CRIME': 'krimen o paglabag sa batas',
    'DISTURBANCE': 'bulao, ingay o public disturbance',
    'NATURAL_DISASTER': 'sakuna o kalamidad dulot ng panahon',
    'OTHER': 'iba pang munting suliranin sa barangay'
  };

  const friendlyType = typeMap[topType.toUpperCase()] || 'mga insidente';

  let alertSummary = "";
  if (totalAlerts > 0) {
    alertSummary = `nakapagtala ang ating tactical systems ng kabuuang ${totalAlerts} na insidente, kung saan ang pinaka-laganap ay ${friendlyType} na may ${topCount} na ulat.`;
  } else {
    alertSummary = `nananatiling tahimik at payapa ang ating nasasakupan dahil walang naitalang ulat sa nakalipas na mga araw.`;
  }

  const activeStatus = activeAlerts > 0 
    ? `Sa kasalukuyan, mayroon tayong ${activeAlerts} aktibong emergency alert na inaasikaso ng ating ${totalTanods} active Tanod responders.` 
    : `Lahat ng patrol sectors ay clear, at ang ating ${totalTanods} Tanod personnel ay patuloy sa regular na pagbabantay.`;

  const recommendation = topType === 'CRIME' || topType === 'DISTURBANCE'
    ? "Iminumungkahi nating dagdagan ang nagpapatrolyang kawani sa mga pampublikong eskinita lalo na kapag sasapit ang gabi."
    : topType === 'MEDICAL'
    ? "Inirerekomenda ang pag-antabay ng ating first-aid responders at pag-inspeksyon sa mga medical emergency kits kagyat sa command post."
    : topType === 'FIRE'
    ? "Dapat pong paigtingin ang kampanya laban sa sunog at i-verify ang fire hydrant accessibility sa barangay."
    : "Ipagpatuloy ang mapagmatyag na pamumuno upang mapanatili ang kaayusan sa bawat nasasakupang dako.";

  return `Magandang araw, Kapitan. Para sa nakaraang pitong araw, ${alertSummary} ${activeStatus} ${recommendation}`;
}

// =============================================================================
// Intelligence Briefing
// =============================================================================
export async function generateIntelligenceBrief(stats: any): Promise<string> {
  try {
    const prompt = `Act as Brgy SOS Intelligence Analyst. Analyze this tactical data for the past 7 days:
${JSON.stringify(stats, null, 2)}

Provide a concise, professional intelligence briefing for the Barangay Captain in Tagalog/English (Taglish). 
Identify the most common incident type and any notable trends or risks. 
Keep the response to exactly 1 short paragraph (max 3 sentences). 
Focus on actionable security insights.`;

    const result = await getAIClient().models.generateContent({
      model: AI_MODELS.pro.name,
      contents: prompt
    });
    return result.text?.trim() || generateRuleBasedIntelligenceBrief(stats);
  } catch (err: any) {
    logAIError("Intelligence Briefing failed, falling back to programmatic summary", err);
    return generateRuleBasedIntelligenceBrief(stats);
  }
}

// =============================================================================
// Main aiService Export
// =============================================================================
export const aiService = {
  analyzeIncident,
  summarizeIncident,
  draftReport,
  translateText,
  askAssistant,
  generateIntelligenceBrief
};

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
