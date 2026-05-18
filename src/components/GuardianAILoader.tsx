// src/components/GuardianAILoader.tsx
// Shows WebLLM model download/load progress in the Admin Dashboard

import { useEffect, useRef, useState } from "react";
import { getWebLLMEngine, isWebLLMReady, setWebLLMProgressCallback } from "../lib/webllm";
import { motion } from "motion/react";

type Variant = "admin" | "compact";

interface GuardianAILoaderProps {
  /** "admin"   → full widget shown in the dashboard header (default)
   *  "compact" → slim inline badge for Tanod/Resident views          */
  variant?: Variant;
}

export function GuardianAILoader({ variant = "admin" }: GuardianAILoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing Guardian AI...");
  const [ready, setReady] = useState(isWebLLMReady());
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Already loaded in a previous mount — nothing to do.
    if (isWebLLMReady()) {
      setReady(true);
      return;
    }

    // Wire the progress bar to WebLLM's download/init ticks.
    setWebLLMProgressCallback((pct, text) => {
      if (!mountedRef.current) return;
      setProgress(pct);
      setStatusText(text);
      // Belt-and-suspenders: also mark ready on the 100% tick.
      if (pct >= 100) setReady(true);
    });

    // FIX: also await the engine promise directly so we catch "ready"
    // even if the callback never fires an exact 100% tick.
    getWebLLMEngine()
      .then(() => {
        if (mountedRef.current) {
          setReady(true);
          setProgress(100);
        }
      })
      .catch((err) => {
        console.warn("[GuardianAILoader] Engine failed to load:", err);
        if (mountedRef.current) setError(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── READY state ────────────────────────────────────────────────────────────

  if (ready) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-900/20 border border-cyan-500/20 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.2)] font-black uppercase tracking-widest">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
          </span>
          AI LINKED
        </span>
      );
    }
    return (
      <div className="flex items-center gap-3 text-cyan-400 text-[10px] font-mono font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded-full shadow-glow-cyan">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        GUARDIAN_CORE: ACTIVE
      </div>
    );
  }

  // ── ERROR state ────────────────────────────────────────────────────────────

  if (error) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-red-400 bg-red-900/20 border border-red-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          AI Offline
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-1 bg-red-900/30 rounded-full">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        AI Failed to Load
      </div>
    );
  }

  // ── LOADING state ──────────────────────────────────────────────────────────

  if (variant === "compact") {
    // Slim bar for Tanod/Resident headers — doesn't dominate the UI.
    return (
      <div className="flex items-center gap-3 text-[9px] font-mono font-black uppercase tracking-widest text-cyan-400 group">
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            animate={{ width: `${progress}%` }}
            className="h-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)]"
          />
        </div>
        <span className="tabular-nums opacity-60">{progress}%</span>
      </div>
    );
  }

  // Full widget for Admin dashboard header.
  return (
    <div className="flex flex-col gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl w-64 shadow-inner relative overflow-hidden">
      <div className="scanline opacity-10" />
      <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-widest text-white/40">
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
          SYNCING_GUARDIAN
        </span>
        <span className="tabular-nums text-cyan-400">{progress}%</span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
        />
      </div>
      <p className="text-[8px] font-mono text-gray-600 truncate italic tracking-tighter">{statusText}</p>
    </div>
  );
}
