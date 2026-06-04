// src/components/GuardianAILoader.tsx
// Shows WebLLM model download/load progress in the Admin Dashboard and Tanod Portal

import { useEffect, useRef, useState } from "react";
import {
  getWebLLMEngine,
  isWebLLMReady,
  isWebLLMLoading,
  setWebLLMProgressCallback,
} from "../lib/webllm";
import { motion } from "motion/react";

type Variant = "admin" | "compact";

interface GuardianAILoaderProps {
  /** "admin"   → full widget shown in the dashboard header (default)
   *  "compact" → slim inline badge for Tanod/Resident views          */
  variant?: Variant;
}

export function GuardianAILoader({ variant = "admin" }: GuardianAILoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(
    isWebLLMLoading() ? "Downloading Guardian AI..." : "AI Standby"
  );
  const [ready, setReady] = useState(isWebLLMReady());
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(isWebLLMLoading());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Already loaded in a previous mount — nothing to do.
    if (isWebLLMReady()) {
      setReady(true);
      setProgress(100);
      return;
    }

    // Direct callback link for safety
    setWebLLMProgressCallback((pct, text) => {
      if (!mountedRef.current) return;
      setProgress(pct);
      setStatusText(text);
      setLoading(true);
      if (pct >= 100) {
        setReady(true);
        setLoading(false);
      }
    });

    // Listen to global custom events for synchronized updates across all assistants
    const handleGuardianEvent = (e: any) => {
      if (!mountedRef.current) return;
      const { type, payload } = e.detail || {};

      if (type === "progress") {
        setReady(false);
        setLoading(true);
        setProgress(payload.progress || 0);
        setStatusText(payload.text || "Loading...");
      } else if (type === "ready") {
        setReady(true);
        setLoading(false);
        setProgress(100);
        setStatusText("AI Ready");
      } else if (type === "error") {
        setError(true);
        setLoading(false);
        console.error("[GuardianAILoader] App event error:", payload);
      }
    };

    window.addEventListener("guardian-ai-event", handleGuardianEvent);

    // Prompt the engine to start only if it is already loading in the background
    if (isWebLLMLoading()) {
      getWebLLMEngine()
        .then(() => {
          if (mountedRef.current) {
            setReady(true);
            setLoading(false);
            setProgress(100);
            setStatusText("AI Ready");
          }
        })
        .catch((err) => {
          console.warn("[GuardianAILoader] Engine failed to load:", err);
          if (mountedRef.current) setError(true);
        });
    }

    return () => {
      mountedRef.current = false;
      window.removeEventListener("guardian-ai-event", handleGuardianEvent);
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
      <div className="flex items-center gap-1.5 sm:gap-3 text-cyan-400 text-[8px] sm:text-[10px] font-mono font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] px-2.5 py-1 sm:px-4 sm:py-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)] whitespace-nowrap shrink-0 animate-in fade-in duration-300">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-cyan-500"></span>
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

  // ── STANDBY state (Not ready, not loading) ─────────────────────────────────

  if (!ready && !loading) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-900/20 border border-zinc-800/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          AI STANDBY
        </span>
      );
    }
    return (
      <div className="flex flex-col gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl w-64 shadow-inner relative overflow-hidden font-sans">
        <div className="scanline opacity-10" />
        <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-widest text-white/40">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            GUARDIAN AI
          </span>
          <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">STANDBY</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-transparent w-0" />
        </div>
        <p className="text-[8px] font-mono text-zinc-500 truncate italic tracking-tighter">
          Ready to activate via voice trigger
        </p>
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
            style={{ width: `${progress}%` }}
            className="h-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)]"
          />
        </div>
        <span className="tabular-nums opacity-60">{progress}%</span>
      </div>
    );
  }

  // Full widget for Admin dashboard header.
  return (
    <div className="flex flex-col gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl w-64 shadow-inner relative overflow-hidden font-sans">
      <div className="scanline opacity-10" />
      <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-widest text-white/40">
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
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
      <p className="text-[8px] font-mono text-gray-400 truncate italic tracking-tighter">
        {statusText}
      </p>
    </div>
  );
}
