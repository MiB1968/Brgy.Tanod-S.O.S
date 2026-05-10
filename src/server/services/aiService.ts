import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const getApiKey = () => process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(getApiKey());

// =============================================================================
// Schema Definition (Single Source of Truth)
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
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// =============================================================================
// Logger (use your existing logger or winston/pino)
// =============================================================================
const log = {
  info: (msg: string, meta?: any) => console.info(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[AI_SERVICE] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

// =============================================================================
// Fallback Analysis (Safe default when AI fails)
// =============================================================================
function createFallbackAnalysis(description: string, initialType?: string): AIAnalysis {
  return {
    incidentType: (initialType?.toUpperCase() as any) || "OTHER",
    severityScore: 5,
    urgency: "HIGH",
    summary: description.length > 100 ? description.substring(0, 97) + "..." : description,
    recommendedResponders: ["Tanod Team"],
    riskFactors: ["AI analysis unavailable"],
    estimatedResponseTimeMins: 15,
    actionRecommendations: [
      "Dispatch nearest available Tanod immediately",
      "Maintain communication with reporter",
      "Prepare for possible escalation"
    ],
  };
}

// =============================================================================
// Main Function
// =============================================================================
export async function analyzeIncident(
  description: string,
  initialType?: string,
  nearestTanodDistanceKm?: number,
  incidentId?: string   // Important for audit trail
): Promise<AIAnalysis> {
  
  const startTime = Date.now();
  const requestId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  log.info("Incident analysis started", { 
    requestId, 
    incidentId, 
    initialType, 
    nearestTanodDistanceKm 
  });

  if (!description?.trim()) {
    log.warn("Empty description received", { requestId, incidentId });
    return createFallbackAnalysis("No description provided", initialType);
  }

  // Sanitize input
  const cleanDescription = description.trim().slice(0, 1500); // Prevent abuse

  if (!getApiKey() || getApiKey() === "missing-key") {
    log.warn("No Gemini API Key found. Using fallback.");
    return createFallbackAnalysis(cleanDescription, initialType);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1,
        topP: 0.85,
      },
    });

    const prompt = `You are **Guardian AI**, an expert emergency response coordinator for a Philippine Barangay. 
You are calm, decisive, accurate, and operationally focused. Your job is to analyze SOS reports and give immediate, actionable guidance to Tanods and the Command Center.

**Context:**
- This is a local barangay setting in the Philippines.
- Common serious incidents include pananaksak (stabbing), domestic violence, floods, typhoons, fires, medical emergencies (especially elderly/children), and community disturbances.
- Tanods typically respond on foot or motorcycle. Average speed: 20 km/h in residential areas.

**Rules:**
- Be decisive. Avoid "OTHER" unless truly impossible to classify.
- Use "NATURAL_DISASTER" for floods, typhoons, landslides, etc.
- Prioritize human life. Domestic violence, crimes with weapons, fires, and medical distress involving vulnerable persons are HIGH or CRITICAL.
- Calculate estimatedResponseTimeMins realistically using the provided distance. Assume 20 km/h average speed + 3 minutes preparation time. Round to nearest integer. Minimum 5 minutes.

**Output must be valid JSON matching this exact schema:**
{
  "incidentType": "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER",
  "severityScore": number,          // 1-10 (10 = life-threatening)
  "urgency": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
  "summary": string,                // 1-2 sentence clear summary
  "recommendedResponders": string[], // e.g. ["Tanod Team Alpha", "BFP", "Medical Responder"]
  "riskFactors": string[],          // e.g. ["Suspected weapon", "Possible domestic issue", "Flooding area"]
  "estimatedResponseTimeMins": number,
  "actionRecommendations": string[]  // Clear, numbered-style actionable items for Tanods + Command Center
}

**Examples:**

Input: "My husband is beating me again. Please send help fast. Zone 3"
Output: {
  "incidentType": "CRIME",
  "severityScore": 9,
  "urgency": "CRITICAL",
  "summary": "Ongoing domestic violence incident in Zone 3.",
  "recommendedResponders": ["Tanod Team", "Barangay Health Worker", "PNP if needed"],
  "riskFactors": ["Suspect may be violent", "Possible ongoing physical assault"],
  "estimatedResponseTimeMins": 8,
  "actionRecommendations": [
    "Approach with caution - possible violent suspect",
    "Prioritize victim safety and extraction",
    "Request backup before entry",
    "Prepare medical assistance for victim"
  ]
}

Input: "Baha na naman dito sa kalsada, malakas ang ulan. Hindi na makadaan ang sasakyan."
Output: {
  "incidentType": "NATURAL_DISASTER",
  "severityScore": 6,
  "urgency": "HIGH",
  "summary": "Flooding reported on main road due to heavy rain.",
  "recommendedResponders": ["Tanod Team", "Barangay Engineering"],
  "riskFactors": ["Impassable road", "Risk of stranded vehicles"],
  "estimatedResponseTimeMins": 12,
  "actionRecommendations": [
    "Assess flood depth and affected households",
    "Set up warning signs and road closure",
    "Coordinate with MDRRMO if worsening"
  ]
}

**Now analyze this incident:**

Initial reported type: ${initialType || 'Unknown'}
Nearest Tanod distance: ${nearestTanodDistanceKm ? nearestTanodDistanceKm.toFixed(2) + ' km' : 'unknown'}
Description: ${cleanDescription}

Respond with **only** the valid JSON object. No explanations, no markdown, no extra text.`;

    // Add timeout protection
    const timeoutMs = 8000; // 8 seconds max
    const resultPromise = model.generateContent(prompt);
    
    const result: any = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI analysis timeout")), timeoutMs)
      )
    ]);

    const response = await result.response;
    const rawText = response.text();

    if (!rawText || rawText.trim() === "") {
      throw new Error("Empty response from Gemini");
    }

    // Robust JSON parsing with fallback strategies
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseError) {
      // Attempt to extract JSON object from markdown/code blocks
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw parseError;
      }
    }

    // Validate against schema
    const validated = AIAnalysisSchema.parse(parsedData);

    const duration = Date.now() - startTime;
    
    log.info("AI analysis completed successfully", {
      requestId,
      incidentId,
      incidentType: validated.incidentType,
      urgency: validated.urgency,
      severityScore: validated.severityScore,
      responseTimeMs: duration,
      estimatedResponseTimeMins: validated.estimatedResponseTimeMins
    });

    return validated;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    log.error("AI analysis failed", {
      requestId,
      incidentId,
      error: error.message || "Unknown error",
      stack: error.stack,
      durationMs: duration,
      descriptionLength: cleanDescription.length,
    });

    // Return safe fallback instead of crashing the SOS flow
    return createFallbackAnalysis(cleanDescription, initialType);
  }
}

