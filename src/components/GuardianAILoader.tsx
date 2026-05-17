// src/components/GuardianAILoader.tsx
// Shows WebLLM model download/load progress — works for Admin, Tanod, and Resident views.
//
// FIX 1: pct >= 100 alone isn't reliable — WebLLM sometimes calls the callback
//         a final time at 100, but sometimes the engine is just "done" without
//         an exact 100 tick. We now also watch the engine promise itself.
// FIX 2: Added `variant` prop so Tanod/Resident views get a compact inline badge
//         instead of the full admin panel widget.

import { useEffect, useRef, useState } from "react";
import { getWebLLMEngine, isWebLLMReady, setWebLLMProgressCallback } from "../lib/webllm";

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
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          AI Ready
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 text-green-400 text-xs px-3 py-1 bg-green-900/30 rounded-full">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Guardian AI Ready
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
      <div className="flex items-center gap-2 text-[10px] font-mono text-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="tabular-nums text-gray-400">{progress}%</span>
      </div>
    );
  }

  // Full widget for Admin dashboard header.
  return (
    <div className="flex flex-col gap-1 px-3 py-2 bg-gray-800/60 rounded-lg w-64">
      <div className="flex items-center justify-between text-xs text-gray-300">
        <span>Loading Guardian AI…</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500 truncate">{statusText}</p>
    </div>
  );
}
