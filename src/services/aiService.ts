export interface AIAnalysis {
  incidentType: "MEDICAL" | "FIRE" | "CRIME" | "DISTURBANCE" | "OTHER";
  severityScore: number; // 1-10
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  summary: string;
  recommendedResponders: string[];
  riskFactors: string[];
}

export async function analyzeIncident(description: string, initialType?: string): Promise<AIAnalysis> {
  const fallback: AIAnalysis = {
    incidentType: (initialType as any)?.toUpperCase() || "OTHER",
    severityScore: 5,
    urgency: "NORMAL",
    summary: description || "SOS Alert received.",
    recommendedResponders: ["Tanod Officer"],
    riskFactors: ["Manual verification required"]
  };

  if (!navigator.onLine) return fallback;

  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, initialType })
    });

    if (!response.ok) throw new Error('Analysis request failed');
    
    return await response.json();
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return fallback;
  }
}
