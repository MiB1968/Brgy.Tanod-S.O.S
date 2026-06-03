import React, { useState } from "react";
import { useGuardianAI } from "../hooks/useGuardianAI";
import IncidentLogger from "./IncidentLogger";
import { Mic, MicOff, Volume2 } from "lucide-react";

const GuardianAssistant: React.FC = () => {
  const { isListening, startVoiceRecognition } = useGuardianAI();
  const [showLogger, setShowLogger] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="p-6 bg-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 shadow-2xl relative">
      {feedback && (
        <div className="absolute -top-12 left-0 right-0 text-center animate-bounce">
          <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            {feedback}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Guardian AI
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          System Ready
        </span>
      </div>
      <button
        onClick={startVoiceRecognition}
        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all ${
          isListening
            ? "bg-red-600 animate-pulse scale-95 shadow-inner"
            : "bg-zinc-800 hover:bg-zinc-700"
        }`}
      >
        {isListening ? (
          <>
            <Mic size={24} className="animate-bounce" />
            <span className="font-bold tracking-tight">
              Listening for S.O.S...
            </span>
          </>
        ) : (
          <>
            <Mic size={20} className="text-red-500" />
            <span className="font-bold tracking-tight">Speak to Guardian</span>
          </>
        )}
      </button>
      <button
        onClick={() => setShowLogger(!showLogger)}
        className="w-full mt-3 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
      >
        {showLogger ? "Close Incident Form" : "Log Incident Manually"}
      </button>
      {showLogger && (
        <IncidentLogger
          onComplete={() => {
            setShowLogger(false);
            triggerFeedback("REPORT FILED");
          }}
        />
      )}
    </div>
  );
};

export default GuardianAssistant;
