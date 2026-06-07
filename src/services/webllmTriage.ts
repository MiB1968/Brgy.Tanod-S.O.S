import { promptWebLLM, isWebLLMReady } from "../lib/webllm";

export interface TriageResult {
  incidentType: string;
  severityScore: number;
  urgency: string;
  summary: string;
  recommendedResponders: string[];
  riskFactors: string[];
  instructions: string[];
  philippineContext?: string; // Additional field for our local logic
}

const TRIAGE_SYSTEM_PROMPT = `
You are a Philippine Barangay Tanod Emergency Dispatcher (GuardianForge AI).
Your task is to triage emergency SOS alerts.
Analyze the provided emergency data and voice transcript.
Respond ONLY with a JSON object in this format:
{
  "incidentType": "MEDICAL | FIRE | CRIME | DISASTER | OTHER",
  "severityScore": 1-10,
  "urgency": "CRITICAL | MODERATE | STABLE",
  "summary": "Short 1-sentence summary of the situation",
  "recommendedResponders": ["Tanod", "Police", "Ambulance", "Firefighters"],
  "riskFactors": ["Crowded area", "Weapon reported", "Spreading", "Vulnerable persons"],
  "instructions": ["Step 1", "Step 2"],
  "philippineContext": "Specific local advice if applicable"
}
Keep summaries concise and in Tagalog if the input is Tagalog.
`;

export async function triageEmergency(
  sosData: any,
  voiceTranscript?: string
): Promise<TriageResult | null> {
  if (!isWebLLMReady()) {
    console.warn("[Triage] WebLLM not ready, skipping offline triage.");
    return null;
  }

  const userContext = `
    Emergency Type: ${sosData.type || "Unknown"}
    Reported By: ${sosData.userDisplayName || "Resident"}
    Voice Transcript: ${voiceTranscript || "No voice recording provided"}
    Metadata: ${JSON.stringify(sosData.metadata || {})}
  `;

  try {
    const rawResponse = await promptWebLLM(TRIAGE_SYSTEM_PROMPT, userContext, 0.3);
    
    // Clean potential markdown code blocks from response
    const cleanedJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedJson) as TriageResult;
  } catch (error) {
    console.error("[Triage] Failed to parse triage response:", error);
    return null;
  }
}
