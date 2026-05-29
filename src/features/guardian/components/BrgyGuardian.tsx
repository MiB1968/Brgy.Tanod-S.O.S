import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';
import { useGuardianStore } from '../store/guardianStore';
import { useVoiceGuardian } from '../hooks/useVoiceGuardian';

export default function BrgyGuardian() {
  const { state, transcript, lastResponse, isEmergency } = useGuardianStore();
  const { startListening, stopListening, isSupported } = useVoiceGuardian();

  const isListening = state === 'LISTENING';

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 bg-zinc-900 border border-red-600/50 rounded-3xl shadow-2xl w-80 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            {isEmergency ? <AlertTriangle className="w-6 h-6 text-white" /> : '🛡️'}
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">AI Guardian</h3>
            <p className="text-xs text-zinc-400">Emergency Voice Assistant</p>
          </div>
        </div>

        <div className="bg-black/40 rounded-2xl p-4 mb-4 min-h-[100px]">
          <p className="text-sm text-zinc-400">Status: <span className="text-green-400 font-medium">{state}</span></p>
          <p className="text-sm mt-2 text-white"><strong>Heard:</strong> "{transcript || '—'}"</p>
          {lastResponse && <p className="text-sm mt-2 text-emerald-400">→ {lastResponse}</p>}
        </div>

        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!isSupported}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all ${
            isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          {isListening ? 'LISTENING... (Tap to Stop)' : 'ACTIVATE AI GUARDIAN'}
        </button>

        <p className="text-center text-[10px] text-zinc-500 mt-3">Speak in Tagalog or English • Works Offline</p>
      </div>
    </div>
  );
}
