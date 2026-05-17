// ============================================================
// FILE: src/services/voiceSOSAgent.ts
//
// PURPOSE:
//   Listens to the resident's voice (Web Speech API),
//   sends the transcript to an on-device WebLLM model,
//   and returns structured SOS data to auto-fill the form.
//
// NO INTERNET NEEDED after first model download (~300MB).
// Works in Tagalog, English, or Taglish.
//
// HOW IT FITS IN YOUR PROJECT:
//   - Import `voiceSOSAgent` in SOSButtonPanel.tsx or ResidentDashboard.tsx
//   - Call startListening() when resident taps the mic button
//   - Use the returned SOSPayload to pre-fill your onInitiateSOS() call
//
// DEPENDENCIES (already in your package.json):
//   - @mlc-ai/web-llm
//   - Web Speech API (built into Chrome/Edge, no install needed)
// ============================================================

import * as webllm from "@mlc-ai/web-llm";
import type { EmergencyType } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SOSPayload {
  /** Detected emergency type — maps directly to your EmergencyType union */
  type: EmergencyType;
  /** Short description the server will receive */
  description: string;
  /** Raw location string extracted from speech (e.g. "likod ng simbahan") */
  locationHint: string;
  /** 1–10 urgency estimate from the model */
  severity: number;
  /** The original transcript so the resident can verify it */
  transcript: string;
  /** True = WebLLM parsed it. False = regex fallback was used. */
  parsedByAI: boolean;
}

export type AgentStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "analyzing"
  | "done"
  | "error";

export type StatusCallback = (status: AgentStatus, detail?: string) => void;
export type ResultCallback = (payload: SOSPayload) => void;

// ── WebLLM Engine (singleton, shared with guardianAIService) ─────────────────

// We reuse your existing model size — no extra download.
const MODEL_ID = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

let _engine: webllm.MLCEngine | null = null;
let _loading = false;

type ProgressCb = (pct: number, text: string) => void;
let _progressCb: ProgressCb | null = null;

export function setLoadProgressCallback(cb: ProgressCb) {
  _progressCb = cb;
}

async function getEngine(): Promise<webllm.MLCEngine> {
  if (_engine) return _engine;

  // If another call is already loading, wait for it
  if (_loading) {
    while (_loading) await new Promise((r) => setTimeout(r, 300));
    return _engine!;
  }

  _loading = true;
  try {
    _engine = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        const pct = Math.round(report.progress * 100);
        _progressCb?.(pct, report.text);
      },
    });
  } finally {
    _loading = false;
  }
  return _engine!;
}

/** Call this early (e.g. when ResidentDashboard mounts) to pre-warm the model */
export function preloadModel(onProgress?: ProgressCb) {
  if (onProgress) setLoadProgressCallback(onProgress);
  getEngine().catch((e) =>
    console.warn("[VoiceSOSAgent] Model preload failed:", e)
  );
}

// ── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(transcript: string): string {
  return `You are an emergency triage assistant for Brgy. Tanod S.O.S., a Philippine barangay emergency system.
A resident just said the following in Tagalog, English, or Taglish:

"${transcript}"

Extract the emergency information and respond with ONLY a valid JSON object — no explanation, no markdown:

{
  "type": "MEDICAL" | "FIRE" | "CRIME" | "NATURAL_DISASTER" | "DISTURBANCE" | "OTHER",
  "description": "Clear English description of the emergency (max 200 chars)",
  "locationHint": "Extracted location or landmark from speech, or empty string if none",
  "severity": 1-10
}

Rules:
- "sunog" or "nasusunog" → FIRE
- "sugatan", "sakit", "aksidente", "injured", "medical" → MEDICAL
- "magnanakaw", "holdap", "nanlaban", "crime", "robbery" → CRIME
- "baha", "lindol", "bagyo", "flood", "earthquake" → NATURAL_DISASTER
- "away", "gulo", "ingay", "disturbance", "fight" → DISTURBANCE
- severity: 1=minor noise, 5=moderate injury, 8=fire/weapon, 10=life-threatening
- description must be in English for the admin dashboard
- locationHint should keep the original Tagalog location name`;
}

// ── Regex Fallback (used when model is not ready yet) ────────────────────────

function regexFallback(transcript: string): Omit<SOSPayload, "transcript" | "parsedByAI"> {
  const t = transcript.toLowerCase();

  // Type detection
  let type: EmergencyType = "OTHER";
  if (/sunog|nasusunog|fire|apoy/.test(t)) type = "FIRE";
  else if (/sugatan|sakit|aksidente|medical|ospital|dugo|injured|hurt/.test(t)) type = "MEDICAL";
  else if (/magnanakaw|holdap|nanlaban|crime|robbery|tulisan|salbahe/.test(t)) type = "CRIME";
  else if (/baha|lindol|bagyo|ulan|flood|earthquake|storm/.test(t)) type = "NATURAL_DISASTER";
  else if (/away|gulo|ingay|disturbance|fight|suntukan/.test(t)) type = "DISTURBANCE";

  // Severity heuristics
  let severity = 5;
  if (/patay|namatay|dead|dying|sunog|fire/.test(t)) severity = 8;
  if (/sandata|baril|kutsilyo|weapon|gun|knife/.test(t)) severity = 9;
  if (/bata|baby|buntis|pregnant|lolo|lola/.test(t)) severity = 7;

  // Location hint — grab what comes after common Tagalog prepositions
  const locMatch = t.match(
    /(?:sa|malapit sa|harap ng|likod ng|tabi ng|kanto ng|daan ng|near|beside|front of|behind)\s+([a-z0-9\s]{3,40})/i
  );
  const locationHint = locMatch ? locMatch[1].trim() : "";

  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase();
  const description = `${typeLabel} emergency reported${locationHint ? ` near ${locationHint}` : ""}. Resident used voice SOS.`;

  return { type, description, locationHint, severity };
}

// ── Web Speech API ────────────────────────────────────────────────────────────

function listenOnce(
  onStatus: StatusCallback,
  lang = "fil-PH"
): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore — SpeechRecognition is available in Chrome/Edge
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      reject(new Error("Speech recognition not supported in this browser."));
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;           // Primary: Filipino
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => onStatus("listening", "Magsalita na...");

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      onStatus("transcribing", transcript);
      resolve(transcript);
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.onend = () => {
      // If no result fired before onend, reject
    };

    recognition.start();

    // Safety timeout — 15 seconds max listening
    setTimeout(() => {
      recognition.stop();
      reject(new Error("Listening timeout — walang narinig."));
    }, 15000);
  });
}

// ── Main Export ───────────────────────────────────────────────────────────────

class VoiceSOSAgent {
  /**
   * Main entry point.
   * 
   * Usage in your component:
   *   const payload = await voiceSOSAgent.startListening(
   *     (status, detail) => setStatus({ status, detail }),
   *   );
   *   if (payload) onInitiateSOS(payload.type, payload.description);
   */
  async startListening(
    onStatus: StatusCallback,
    lang: "fil-PH" | "en-US" = "fil-PH"
  ): Promise<SOSPayload | null> {
    try {
      // Step 1: Capture voice
      const transcript = await listenOnce(onStatus, lang);
      if (!transcript.trim()) {
        onStatus("error", "Walang narinig. Subukang muli.");
        return null;
      }

      onStatus("analyzing", "Sinusuri ang inyong ulat...");

      // Step 2: Try WebLLM first (500ms timeout — if model not ready, fallback)
      let payload: Omit<SOSPayload, "transcript" | "parsedByAI">;
      let parsedByAI = false;

      try {
        const engine = await Promise.race([
          getEngine(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Engine not ready")), 800)
          ),
        ]);

        const response = await engine.chat.completions.create({
          messages: [
            { role: "user", content: buildPrompt(transcript) },
          ],
          max_tokens: 150,
          temperature: 0.1,   // Low temp = consistent structured output
        });

        const raw = response.choices[0]?.message?.content ?? "{}";
        const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
        const parsed = JSON.parse(clean);

        // Validate required fields
        if (!parsed.type || !parsed.description) throw new Error("Invalid AI response shape");

        payload = {
          type: parsed.type as EmergencyType,
          description: parsed.description,
          locationHint: parsed.locationHint ?? "",
          severity: Number(parsed.severity) || 5,
        };
        parsedByAI = true;

      } catch {
        // WebLLM not ready or parse failed — use regex fallback
        console.warn("[VoiceSOSAgent] AI parse failed, using regex fallback");
        payload = regexFallback(transcript);
        parsedByAI = false;
      }

      const result: SOSPayload = {
        ...payload,
        transcript,
        parsedByAI,
      };

      onStatus("done", result.description);
      return result;

    } catch (err: any) {
      onStatus("error", err.message);
      return null;
    }
  }

  /** Returns true if the WebLLM model is already in memory */
  isModelReady(): boolean {
    return _engine !== null;
  }
}

export const voiceSOSAgent = new VoiceSOSAgent();
