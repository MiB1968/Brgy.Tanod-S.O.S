import { GoogleGenAI, Type } from "@google/genai";

export interface AIAnalysis {
  incidentType: "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "OTHER";
  severityScore: number; // 1-10
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  summary: string;
  recommendedResponders: string[];
  riskFactors: string[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeIncident(description: string, initialType?: string): Promise<AIAnalysis> {
  const fallback: AIAnalysis = {
    incidentType: (initialType as any)?.toUpperCase() || "OTHER",
    severityScore: 5,
    urgency: "NORMAL",
    summary: description || "SOS Alert received.",
    recommendedResponders: ["Tanod Officer"],
    riskFactors: ["Manual verification required"]
  };

  if (!navigator.onLine || !process.env.GEMINI_API_KEY) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          text: `Analyze this emergency incident report for a Philippine Barangay:
          Description: "${description}"
          Initial Category: "${initialType}"
          
          Provide a structured emergency assessment.`
        }
      ],
      config: {
        systemInstruction: "You are a tactical emergency dispatcher. Extract structured data from reports.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incidentType: { 
              type: Type.STRING, 
              enum: ["MEDICAL", "FIRE", "CRIME", "DISTURBANCE", "OTHER"] 
            },
            severityScore: { type: Type.NUMBER, description: "1-10 scale" },
            urgency: { 
              type: Type.STRING, 
              enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"] 
            },
            summary: { type: Type.STRING },
            recommendedResponders: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            riskFactors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["incidentType", "severityScore", "urgency", "summary", "recommendedResponders", "riskFactors"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return fallback;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return fallback;
  }
}
