/**
 * Client-side AI Service
 * SECURITY: This file must NEVER call Gemini directly.
 * All AI requests are proxied through the Express backend (/api/ai/analyze)
 * so that API keys remain server-side and out of the browser bundle.
 */
import { fetchAPI } from '../lib/api';

export interface AIAnalysis {
  incidentType: "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "NATURAL_DISASTER" | "OTHER";
  severityScore: number;
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  summary: string;
  recommendedResponders: string[];
  riskFactors: string[];
  actionRecommendations: string[];
}

const FALLBACK: AIAnalysis = {
  incidentType: "OTHER",
  severityScore: 5,
  urgency: "HIGH",
  summary: "SOS Alert received. AI analysis unavailable.",
  recommendedResponders: ["Tanod Team"],
  riskFactors: ["Manual verification required"],
  actionRecommendations: [
    "Dispatch nearest available Tanod immediately",
    "Maintain communication with the reporter",
    "Prepare for possible escalation",
  ],
};

export async function analyzeIncident(
  description: string,
  initialType?: string
): Promise<AIAnalysis> {
  try {
    const data = await fetchAPI('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ description, initialType }),
    });
    return data?.analysis ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
