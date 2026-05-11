import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Power, Settings } from 'lucide-react';
import socket from '../../lib/socket';
import { useAuthStore } from '../../store/useAuthStore';
import { safeStorage } from '../../lib/safeStorage';
import { JarvisSettingsPanel, VoiceSettings, defaultSettings } from './JarvisSettingsPanel';
import VoiceBiometricModal from './VoiceBiometricModal';

export function JarvisVoice() {
  const { profile } = useAuthStore();
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [jarvisReply, setJarvisReply] = useState("Systems online. How may I assist you, Sir?");
  const [status, setStatus] = useState("Standby");
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = safeStorage.getItem('jarvis-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [proposedActions, setProposedActions] = useState<any[]>([]);
  const [actionToConfirm, setActionToConfirm] = useState<any>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  const recognitionRef = useRef<any>(null);
  const wakeWord = voiceSettings.wakeWord;

  useEffect(() => {
    const role = profile?.role;
    if (!['admin', 'superadmin', 'captain'].includes(role?.toLowerCase() || '')) {
      setJarvisReply("Voice command access restricted. Admin privileges required.");
    }
  }, [profile]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const rec = recognitionRef.current;
    
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = voiceSettings.language === 'fil' ? 'fil-PH' : 'en-PH'; 

    rec.onresult = async (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase();
        finalTranscript = text;
      }

      setTranscript(finalTranscript);

      if (finalTranscript.includes(wakeWord)) {
        setIsListening(true);
        setStatus("Listening...");
        
        const command = finalTranscript.replace(wakeWord, '').trim();
        if (command.length > 3) {
          handleCommand(command);
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech error:", event);
      setIsListening(voiceSettings.autoListen);
    };

    rec.onend = () => {
        if (isActive && voiceSettings.autoListen && !isListening) {
             rec.start();
        }
    }

    return () => rec.stop();
  }, [voiceSettings.language, wakeWord, isActive, voiceSettings.autoListen, isListening]);

  const toggleJarvis = () => {
    setIsActive(!isActive);
    if (!isActive) {
      recognitionRef.current?.start();
      setStatus("JARVIS Online");
      speak(voiceSettings.language === 'fil' ? "Handa na ako, Sir. Ano ang kailangan niyo?" : "Systems online. Awaiting your command, Sir.");
    } else {
      recognitionRef.current?.stop();
      setStatus("Standby");
      speak(voiceSettings.language === 'fil' ? "Nag ooffline, mag-ingat po kayo, Sir." : "Going offline. Stay safe, Sir.");
    }
  };

  const handleCommand = async (command: string) => {
    setStatus("Processing...");
    
    try {
      socket.emit('voice-command', { transcript: command, language: voiceSettings.language });
      speak(voiceSettings.language === 'fil' ? "Nagsusuri po..." : "Analyzing...");
    } catch (err) {
      speak(voiceSettings.language === 'fil' ? "Paumanhin, may aberya po akong naranasan." : "I'm sorry Sir, I encountered an error.");
    }
  };

  useEffect(() => {
      const handleVoiceResponse = (data: any) => {
         setStatus("Response Ready");
         speak(data.reply);
         if (data.specialActivation === "RUBY_PROTOCOL") {
            setIsSuperAdminMode(true);
         }
         if (data.proposedActions && data.proposedActions.length > 0) {
            setProposedActions(data.proposedActions);
         }
      };
      
      const handleVoiceAnomaly = (data: any) => {
          setStatus("Anomaly Detected");
          speak(data.message);
      };

      const handleVoiceError = (data: any) => {
          setStatus("Error");
          speak(data.message);
      };

      socket.on('VOICE_RESPONSE', handleVoiceResponse);
      socket.on('voice-anomaly', handleVoiceAnomaly);
      socket.on('voice-error', handleVoiceError);

      return () => {
          socket.off('VOICE_RESPONSE', handleVoiceResponse);
          socket.off('voice-anomaly', handleVoiceAnomaly);
          socket.off('voice-error', handleVoiceError);
      }
  }, [voiceSettings.speed, voiceSettings.pitch, voiceSettings.volume, voiceSettings.language]);

  const speak = async (text: string) => {
    setJarvisReply(text);
    setStatus("Speaking...");

    try {
      // Try to get audio from backend server via TTS API
      const token = safeStorage.getItem('token');
      const response = await fetch('/api/system/tts', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
           text, 
           settings: {
              voiceId: voiceSettings.voiceId,
              stability: voiceSettings.stability,
              similarity_boost: voiceSettings.similarity,
              style: voiceSettings.style,
           } 
        })
      });

      if (response.ok) {
        if (response.headers.get('content-type')?.includes('audio')) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
             setStatus("Standby");
             if (voiceSettings.autoListen) setIsListening(true);
          }
          audio.play();
          return;
        } else {
          throw new Error('Received non-audio response from TTS server');
        }
      }
    } catch (err) {
      console.error("ElevenLabs request failed, falling back to browser TTS", err);
    }
    
    // Fallback to browser SpeechSynthesis
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    let bestVoice;

    if (voiceSettings.language === 'fil') {
       bestVoice = voices.find(v => v.lang.includes('fil') || v.name.toLowerCase().includes('filipino'));
       utterance.lang = 'fil-PH';
    } else {
       bestVoice = voices.find(voice => 
         voice.name.includes('UK') || 
         voice.name.includes('British') || 
         voice.lang.includes('en-GB')
       );
       utterance.lang = 'en-GB';
    }
    
    if (bestVoice) utterance.voice = bestVoice;
    utterance.rate = voiceSettings.speed;     
    utterance.pitch = voiceSettings.pitch;    
    utterance.volume = voiceSettings.volume;

    utterance.onend = () => {
        setStatus("Standby");
        if (voiceSettings.autoListen && isActive) setIsListening(true);
    }
    window.speechSynthesis.speak(utterance);
  };

  const isAdmin = ['admin', 'superadmin', 'captain'].includes(profile?.role?.toLowerCase() || '');

  return (
    <>
      <div className={`bg-gradient-to-br from-zinc-950 to-black border ${isSuperAdminMode ? 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]' : 'border-amber-500/50'} rounded-xl p-4 flex flex-col mt-4 shadow-xl transition-all duration-500`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isSuperAdminMode ? 'bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : isActive ? 'bg-amber-500' : 'bg-green-500'}`} />
            <h2 className={`text-lg font-bold font-mono tracking-wider transition-colors ${isSuperAdminMode ? 'text-red-500' : 'text-amber-400'}`}>JARVIS</h2>
            {isSuperAdminMode && (
               <div className="bg-red-600 border border-red-400/50 shadow-[0_0_15px_rgba(220,38,38,0.5)] text-white text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1 uppercase tracking-wider">
                  SUPER ADMIN
               </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={() => setShowSettings(true)}
               className={`p-1.5 hover:bg-white/10 rounded-full transition-all ${isSuperAdminMode ? 'text-red-400 hover:text-red-300' : 'text-amber-400 hover:bg-amber-500/20'}`}
            >
               <Settings size={18} />
            </button>
            {isAdmin && (
              <button
                onClick={toggleJarvis}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
              >
                <Power size={14} /> {isActive ? 'Disable' : 'Enable'}
              </button>
            )}
          </div>
        </div>

        <div className={`bg-black/60 rounded-lg p-3 min-h-[80px] mb-4 text-xs font-mono leading-relaxed border transition-colors ${isSuperAdminMode ? 'border-red-500/30 text-red-300' : 'border-amber-500/10 text-amber-200/80'}`}>
          {jarvisReply}
        </div>

        <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3">
          <span>Status: <span className={isSuperAdminMode ? 'text-red-500' : 'text-amber-400'}>{status}</span></span>
          {transcript && <span className="truncate max-w-[150px]" title={transcript}>"{transcript}"</span>}
        </div>

        <button
          onClick={() => {
              if (isActive) {
                  const newState = !isListening;
                  setIsListening(newState);
                  if (newState) {
                      recognitionRef.current?.start();
                  } else {
                      recognitionRef.current?.stop();
                  }
              }
          }}
          disabled={!isActive || !isAdmin}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-all ${
            isListening 
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/50' 
              : isSuperAdminMode 
                ? 'bg-red-950/40 text-red-500 hover:bg-red-900/40 border border-red-800/50'
                : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/50'
          } ${(!isActive || !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          {isListening ? `Listening... (Say '${wakeWord}')` : "Activate Voice"}
        </button>

        {proposedActions.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
            <p className="font-medium text-amber-400 font-mono tracking-wider mb-2">ACTIONS REQUIRING CONFIRMATION</p>
            {proposedActions.map((action, idx) => (
               <button
                 key={idx}
                 onClick={() => {
                     setActionToConfirm(action);
                     setShowBiometricModal(true);
                 }}
                 className="w-full text-left px-3 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 rounded-lg text-xs font-mono font-bold transition-all mb-2 flex items-center justify-between"
               >
                 <span>&gt; {action?.type?.replace(/_/g, ' ') || 'CONFIRM ACTION'}</span>
                 <span className="text-[10px] text-amber-500">{action.confidence ? `${(action.confidence * 100).toFixed(0)}% CONFIDENCE` : ''}</span>
               </button>
            ))}
            <p className="text-[10px] text-gray-500 mt-1 font-mono">
              Only Admin / Super Admin can approve this action via biometric verification
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-600 mt-3 font-mono">
          Wake word: <span className="text-amber-400">"{wakeWord}"</span>
        </p>
      </div>

      {showBiometricModal && (
         <VoiceBiometricModal
            isOpen={showBiometricModal}
            actionType={actionToConfirm?.type}
            onCancel={() => {
                setShowBiometricModal(false);
                setActionToConfirm(null);
            }}
            onVerified={(audioBlob) => {
                setShowBiometricModal(false);
                socket.emit('confirm-action', { action: actionToConfirm, voiceSample: audioBlob });
                setProposedActions(prev => prev.filter(a => a !== actionToConfirm));
                setActionToConfirm(null);
                setJarvisReply("Action confirmed and executed, Sir.");
            }}
         />
      )}

      <JarvisSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialSettings={voiceSettings}
        onSave={(newSettings) => {
          safeStorage.setItem('jarvis-settings', JSON.stringify(newSettings));
          setVoiceSettings(newSettings);
        }}
      />
    </>
  );
}
