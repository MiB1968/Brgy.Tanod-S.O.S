// ============================================================
// FILE: src/components/Resident/VoiceSOSButton.tsx
//
// PURPOSE:
//   A mic button the resident taps to speak their emergency.
//   WebLLM parses the Taglish speech and auto-fills the SOS.
//
// HOW TO ADD IT TO SOSButtonPanel.tsx:
//   1. Import this component:
//      import { VoiceSOSButton } from './VoiceSOSButton';
//
//   2. Add it inside SOSButtonPanel's return, below the specialized buttons grid:
//      <VoiceSOSButton onSOSReady={(type, desc) => onInitiateSOS(type, desc)} />
//
// THAT'S IT. No other changes needed.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Activity,
  Waves,
  Cloud,
} from "lucide-react";
import {
  voiceSOSAgent,
  preloadModel,
  SOSPayload,
  AgentStatus,
} from "../../services/voiceSOSAgent";
import type { EmergencyType } from "../../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  EmergencyType,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  FIRE: {
    label: "Sunog",
    color: "text-orange-400",
    bg: "bg-orange-500/20 border-orange-500/40",
    icon: <Zap className="w-4 h-4" />,
  },
  MEDICAL: {
    label: "Medical",
    color: "text-blue-400",
    bg: "bg-blue-500/20 border-blue-500/40",
    icon: <Activity className="w-4 h-4" />,
  },
  CRIME: {
    label: "Krimen",
    color: "text-red-400",
    bg: "bg-red-500/20 border-red-500/40",
    icon: <Shield className="w-4 h-4" />,
  },
  NATURAL_DISASTER: {
    label: "Sakuna",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20 border-yellow-500/40",
    icon: <Waves className="w-4 h-4" />,
  },
  DISTURBANCE: {
    label: "Gulo",
    color: "text-purple-400",
    bg: "bg-purple-500/20 border-purple-500/40",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  FLOOD: {
    label: "Baha",
    color: "text-cyan-400",
    bg: "bg-cyan-500/20 border-cyan-500/40",
    icon: <Waves className="w-4 h-4" />,
  },
  VIOLENCE: {
    label: "Karahasan",
    color: "text-red-500",
    bg: "bg-red-600/20 border-red-600/40",
    icon: <Shield className="w-4 h-4" />,
  },
  OTHER: {
    label: "Iba pa",
    color: "text-white/70",
    bg: "bg-white/10 border-white/20",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

const STATUS_MESSAGES: Record<AgentStatus, string> = {
  idle: "Pindutin para magsalita",
  listening: "Magsalita na... (Tagalog/English)",
  transcribing: "Narinig...",
  analyzing: "Sinusuri ng AI...",
  done: "Naproseso!",
  error: "May error",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface VoiceSOSButtonProps {
  /** Called when voice is parsed — pass to your onInitiateSOS */
  onSOSReady: (type: EmergencyType, description: string) => void;
  /** Called if user wants to manually edit before sending */
  onPreview?: (payload: SOSPayload) => void;
}

export function VoiceSOSButton({ onSOSReady, onPreview }: VoiceSOSButtonProps) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [payload, setPayload] = useState<SOSPayload | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelPct, setModelPct] = useState(0);
  const isListening = status === "listening";
  const isProcessing = status === "transcribing" || status === "analyzing";
  const isDone = status === "done";
  const isError = status === "error";

  // Listen for model status and synchronized updates without forcing download on mount
  useEffect(() => {
    // Check if already loaded
    if (voiceSOSAgent.isModelReady()) {
      setModelReady(true);
      setModelPct(100);
    }

    const handleGuardianEvent = (e: any) => {
      const { type, payload } = e.detail || {};

      if (type === "progress") {
        const progress = payload.progress || 0;
        setModelPct(progress);
        if (progress >= 100) {
          setModelReady(true);
        }
      } else if (type === "ready") {
        setModelReady(true);
        setModelPct(100);
      }
    };

    window.addEventListener("guardian-ai-event", handleGuardianEvent);
    return () => {
      window.removeEventListener("guardian-ai-event", handleGuardianEvent);
    };
  }, []);

  const handleMicPress = async () => {
    if (isListening || isProcessing) return;

    // Lazy load model on demand if not already preloaded or ready
    if (!modelReady && !voiceSOSAgent.isModelReady()) {
      preloadModel((pct) => {
        setModelPct(pct);
        if (pct >= 100) setModelReady(true);
      });
    }

    setPayload(null);
    setStatus("idle");

    const result = await voiceSOSAgent.startListening((s, detail) => {
      setStatus(s);
      if (detail) setStatusDetail(detail);
    });

    if (result) {
      setPayload(result);
    }
  };

  const handleSend = () => {
    if (!payload) return;
    onSOSReady(payload.type, payload.description);
    resetState();
  };

  const handlePreview = () => {
    if (!payload || !onPreview) return;
    onPreview(payload);
    resetState();
  };

  const resetState = () => {
    setPayload(null);
    setStatus("idle");
    setStatusDetail("");
  };

  const typeConf = payload ? TYPE_CONFIG[payload.type] : null;

  return (
    <div className="mt-6 space-y-3">
      {/* ── Model loading indicator ── */}
      {!modelReady && modelPct > 0 && modelPct < 100 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <Cloud className="w-4 h-4 text-cyan-400/70 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                AI Model Loading
              </span>
              <span className="text-[10px] font-mono text-cyan-400/70">
                {modelPct}%
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500/60 rounded-full"
                animate={{ width: `${modelPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mic Button ── */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          onClick={handleMicPress}
          disabled={isListening || isProcessing}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={`
            relative w-full flex items-center justify-center gap-3 
            px-6 py-4 rounded-2xl border font-black tracking-widest text-sm uppercase
            transition-all duration-300 overflow-hidden
            ${
              isListening
                ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                : isProcessing
                ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-300 cursor-wait"
                : isError
                ? "bg-red-500/10 border-red-400/40 text-red-300"
                : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30"
            }
          `}
        >
          {/* Pulse ring when listening */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40"
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}

          {/* Icon */}
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <Mic className="w-5 h-5 text-emerald-300" />
            </motion.div>
          ) : isError ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}

          <span>
            {isListening
              ? "Nakikinig..."
              : isProcessing
              ? "Sinusuri..."
              : isError
              ? "Subukang muli"
              : "🎤 Voice SOS"}
          </span>

          {/* AI badge */}
          {!modelReady && !isListening && !isProcessing && (
            <span className="ml-auto text-[9px] font-mono text-white/30 tracking-wider normal-case">
              (AI loading)
            </span>
          )}
          {modelReady && !isListening && !isProcessing && (
            <span className="ml-auto text-[9px] font-mono text-emerald-400/60 tracking-wider normal-case">
              AI ready
            </span>
          )}
        </motion.button>

        {/* Status text */}
        <AnimatePresence mode="wait">
          {(statusDetail || status !== "idle") && (
            <motion.p
              key={statusDetail}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-[11px] font-mono text-center tracking-wider ${
                isError
                  ? "text-red-400"
                  : isListening
                  ? "text-emerald-400"
                  : "text-white/40"
              }`}
            >
              {statusDetail || STATUS_MESSAGES[status]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Result Preview Card ── */}
      <AnimatePresence>
        {payload && typeConf && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`rounded-2xl border p-4 space-y-3 ${typeConf.bg}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-2 font-black text-sm tracking-widest uppercase ${typeConf.color}`}
              >
                {typeConf.icon}
                {typeConf.label}
              </div>
              <div className="flex items-center gap-1">
                {payload.parsedByAI ? (
                  <span className="text-[9px] font-mono text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    AI ✓
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    Regex fallback
                  </span>
                )}
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    payload.severity >= 8
                      ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : payload.severity >= 5
                      ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                      : "text-white/40 bg-white/5 border-white/10"
                  }`}
                >
                  Severity {payload.severity}/10
                </span>
              </div>
            </div>

            {/* Transcript */}
            <div className="px-3 py-2 bg-black/30 rounded-xl border border-white/5">
              <p className="text-[10px] font-mono text-white/40 mb-1 uppercase tracking-widest">
                Sinabi mo:
              </p>
              <p className="text-xs text-white/70 italic">
                "{payload.transcript}"
              </p>
            </div>

            {/* Parsed description */}
            <div>
              <p className="text-[10px] font-mono text-white/40 mb-1 uppercase tracking-widest">
                Para sa admin:
              </p>
              <p className="text-xs text-white/80">{payload.description}</p>
              {payload.locationHint && (
                <p className="text-[11px] text-white/50 mt-1">
                  📍 {payload.locationHint}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSend}
                className={`
                  flex-1 flex items-center justify-center gap-2 
                  py-3 rounded-xl font-black text-xs tracking-widest uppercase
                  bg-gradient-to-r from-red-600 to-red-500 
                  hover:from-red-500 hover:to-red-400
                  text-white shadow-lg shadow-red-900/40
                  transition-all
                `}
              >
                <CheckCircle2 className="w-4 h-4" />
                Ipadala SOS
              </motion.button>

              {onPreview && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePreview}
                  className="px-4 py-3 rounded-xl font-black text-xs tracking-widest uppercase bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 transition-all"
                >
                  I-edit
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={resetState}
                className="px-4 py-3 rounded-xl font-black text-xs tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 transition-all"
              >
                Burahin
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
