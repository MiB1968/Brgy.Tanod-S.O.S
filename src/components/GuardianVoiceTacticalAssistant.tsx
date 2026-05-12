import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertTriangle, X, Settings } from 'lucide-react';
import { voiceService, VoiceOptions } from '../services/voiceService';

interface GuardianVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onSOS?: () => void;
  onCommand?: (action: string, transcript: string) => void;
}

const FilipinoVoices = [
  { id: 'fil-PH-BlessicaNeural', label: 'Blessica (Female)' },
  { id: 'fil-PH-AngeloNeural', label: 'Angelo (Male)' },
];

const GuardianVoiceTacticalAssistant: React.FC<GuardianVoiceAssistantProps> = ({
  isOpen, onClose, onSOS, onCommand,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('GUARDIAN AI ONLINE');
  const [error, setError] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(voiceService.defaultVoice);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  const recognitionRef = useRef<any>(null);

  const speak = async (text: string, options: VoiceOptions = {}) => {
    setIsSpeaking(true);
    setStatus('Nagsasalita...');
    await voiceService.speak(text, { ...options, voice: selectedVoice });
    setIsSpeaking(false);
    setStatus('GUARDIAN AI ONLINE');
  };

  useEffect(() => {
    if (!isOpen) {
      stopAll();
      return;
    }
    setStatus('GUARDIAN AI ONLINE');
    setTranscript('');
    setError('');
  }, [isOpen]);

  const startListening = () => {
    const onResult = (text: string, isFinal: boolean) => {
      setTranscript(text);
      if (isFinal) {
        setStatus('Pinoproseso...');
        processCommand(text);
      } else {
        setStatus(`Nakikinig... "${text}"`);
      }
    };

    const onError = (err: any) => {
      setError('May problema sa mikropono');
      setTimeout(() => setError(''), 2500);
      stopListening();
    };

    recognitionRef.current = voiceService.startListening(onResult, onError);
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      voiceService.stopListening(recognitionRef.current);
    }
    setIsListening(false);
  };

  const stopAll = () => {
    stopListening();
    setIsSpeaking(false);
  };

  const processCommand = async (text: string) => {
    try {
      const isSOS = /sos|emergency|sakuna|tulungan|help|sunog/i.test(text.toLowerCase());
      if (isSOS) {
        onSOS?.();
        await speak("SOS! Naipadala na ang alert. Tumutugon na ang mga Tanod.");
      } else {
        onCommand?.('general', text);
        await speak(`Naintindihan ko: ${text}`);
      }
    } catch {
      await speak(`Natanggap ko: ${text}`);
    }
  };

  const triggerSOS = () => {
    onSOS?.();
    speak("EMERGENCY SOS ACTIVATED! Lahat ng Tanod ay tinatawag.");
  };

  const testVoice = () => {
    speak("Ako si Guardian. Test ng Filipino voice para sa Barangay Tanod S.O.S.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0f1c] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl">
        
        <div className="bg-gradient-to-r from-red-950 to-cyan-950 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">G</span>
            </div>
            <div>
              <div className="text-white font-bold">GUARDIAN AI</div>
              <div className="text-xs text-cyan-400">Filipino Voice System</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVoiceSelector(!showVoiceSelector)}>
              <Settings size={24} className="text-cyan-400" />
            </button>
            <button onClick={onClose}>
              <X size={28} className="text-gray-400" />
            </button>
          </div>
        </div>

        {showVoiceSelector && (
          <div className="p-4 border-b border-gray-700">
            <p className="text-xs text-gray-400 mb-2">PUMILI NG Boses</p>
            <div className="grid grid-cols-2 gap-2">
              {FilipinoVoices.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`py-3 rounded-2xl text-sm ${selectedVoice === v.id ? 'bg-cyan-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 text-center">
          <div className={`font-mono text-sm mb-4 ${isListening ? 'text-red-500' : 'text-cyan-400'}`}>
            {status}
          </div>
          {transcript && <div className="italic bg-black/60 p-4 rounded-2xl text-gray-200">"{transcript}"</div>}
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex justify-center py-10">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking}
            className={`w-40 h-40 rounded-full border-8 flex items-center justify-center transition-all
              ${isListening ? 'border-red-500 bg-red-500/10 animate-pulse' : 'border-cyan-400 hover:border-white'}`}
          >
            {isListening ? <MicOff size={80} className="text-red-500" /> : <Mic size={80} className="text-cyan-400" />}
          </button>
        </div>

        <div className="px-6 pb-8 grid grid-cols-2 gap-4">
          <button onClick={triggerSOS} className="bg-red-600 hover:bg-red-700 py-6 rounded-2xl font-bold flex items-center justify-center gap-3">
            <AlertTriangle size={28} /> EMERGENCY SOS
          </button>
          <button onClick={testVoice} className="bg-gray-800 hover:bg-gray-700 py-6 rounded-2xl font-medium flex items-center justify-center gap-3">
            <Volume2 size={28} /> TEST VOICE
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardianVoiceTacticalAssistant;
