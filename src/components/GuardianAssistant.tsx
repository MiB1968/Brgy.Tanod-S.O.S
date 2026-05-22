import React, { useState } from 'react';
import { useGuardianAI } from '../hooks/useGuardianAI';
import IncidentLogger from './IncidentLogger';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const GuardianAssistant: React.FC = () => {
  const { isListening, startVoiceRecognition, speak } = useGuardianAI();
  const [showLogger, setShowLogger] = useState(false);

  return (
    <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl border border-red-900/30">
      <h2 className="text-xl font-bold mb-4">🛡️ Guardian AI</h2>
      <button onClick={startVoiceRecognition} className={`w-full py-5 rounded-2xl ${isListening ? 'bg-red-600' : 'bg-zinc-800'}`}>
        {isListening ? 'Listening...' : 'Speak to Guardian'}
      </button>
      <button onClick={() => setShowLogger(!showLogger)} className="w-full mt-3 py-4 bg-amber-600 rounded-2xl">Log Incident</button>
      {showLogger && <IncidentLogger />}
    </div>
  );
};

export default GuardianAssistant;
