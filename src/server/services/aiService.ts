import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || "";
};

const genAI = new GoogleGenerativeAI(getApiKey());
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

export interface AIAnalysis {
  incidentType: "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER";
  severityScore: number; // 1-10
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  summary: string;
  recommendedResponders: string[];
  riskFactors: string[];
  estimatedResponseTimeMins: number; // 1 for critical, up to 15 for low
  actionRecommendations: string[];
}

export async function analyzeIncident(description: string, initialType?: string, nearestTanodDistanceKm?: number): Promise<AIAnalysis> {
  const defaultFallback: AIAnalysis = {
    incidentType: (initialType?.toUpperCase() as any) || "OTHER",
    severityScore: 5,
    urgency: "NORMAL",
    summary: description || "SOS Alert received.",
    recommendedResponders: ["Tanod"],
    riskFactors: ["Manual categorization fallback"],
    estimatedResponseTimeMins: 5,
    actionRecommendations: ["Dispatch nearest available Tanod"]
  };

  if (!getApiKey() || getApiKey() === "missing-key") {
    console.warn("[AI_SERVICE] No Gemini API Key found. Using fallback.");
    return defaultFallback;
  }

  try {
    const defaultSchemaStr = `
    Respond in strict JSON format. Ensure the schema matches:
    {
      "incidentType": "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER",
      "severityScore": number (1-10),
      "urgency": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
      "summary": string,
      "recommendedResponders": string[],
      "riskFactors": string[],
      "estimatedResponseTimeMins": number,
      "actionRecommendations": string[]
    }`;

    const prompt = `Analyze the following emergency SOS description and categorize it. 
    You are an emergency response AI for a Philippine Barangay (local community).
    Be decisive with "incidentType" and avoid "OTHER" whenever possible. Include "NATURAL_DISASTER" for floods or typhoons.
    Calibrate "urgency" for the Philippine context (e.g., domestic violence, knife incidents (pananaksak), fire, flooding are HIGH/CRITICAL).
    The nearest Tanod (responder) is estimated to be ${nearestTanodDistanceKm ? nearestTanodDistanceKm.toFixed(2) + ' km' : 'unknown distance'} away. Calculate a realistic "estimatedResponseTimeMins" (assume walking/motorcycle speed of 15-30 km/h).
    Provide structural "actionRecommendations" for the Command Center and responders (e.g., "Bring first aid", "Call BFP immediately", "Approach with caution").

    Initial reported type: ${initialType || 'Unknown'}
    Description: ${description}
    
    ${defaultSchemaStr}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as AIAnalysis;
  } catch (error) {
    console.error("[AI_SERVICE] Analysis failed:", error);
    return defaultFallback;
  }
}
