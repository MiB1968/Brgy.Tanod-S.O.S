// src/components/GuardianAILoader.tsx
// Shows WebLLM model download/load progress in the Admin Dashboard

import { useEffect, useState } from "react";
import { guardianAI } from "../services/guardianAIService";

export function GuardianAILoader() {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing Guardian AI...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (guardianAI.isReady()) {
      setReady(true);
      return;
    }

    guardianAI.preload((pct, text) => {
      setProgress(pct);
      setStatusText(text);
      if (pct >= 100) setReady(true);
    });
  }, []);

  if (ready) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-xs px-3 py-1 bg-green-900/30 rounded-full">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Guardian AI Ready
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2 bg-gray-800/60 rounded-lg w-64">
      <div className="flex items-center justify-between text-xs text-gray-300">
        <span>Loading Guardian AI...</span>
        <span>{progress}%</span>
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
