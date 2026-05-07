import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, Shield, Zap, Info, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface JarvisAssistantProps {
  onCommand?: (command: string, action?: string, payload?: any) => void;
}

export const JarvisAssistant: React.FC<JarvisAssistantProps> = ({ onCommand }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jarvisVoice, setJarvisVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const { profile } = useAuthStore();

  // Voice selection logic
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Improved British Male voice lookup
      const preferred = voices.find(v => 
        (v.name.toLowerCase().includes('jarvis') || v.name.toLowerCase().includes('google uk english male') || v.name === 'Daniel' || v.name === 'Arthur' || v.name === 'Microsoft James' || v.lang === 'en-GB')
      ) || voices.find(v => v.lang.startsWith('en-GB')) 
        || voices.find(v => v.lang.startsWith('en'));

      if (preferred) {
        console.log("Jarvis: Voice initialized as", preferred.name);
        setJarvisVoice(preferred);
      }
    };

    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          console.log("Jarvis: Final transcript perceived:", transcriptText);
          handleCommand(transcriptText.toLowerCase());
        }
      };

      recognitionRef.current.onstart = () => {
        console.log("Jarvis: Voice recognition started.");
        setIsListening(true);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Jarvis: Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          speak("Microphone access denied. Please enable permissions in your browser. If you are in AI Studio, try opening the application in a new tab.");
          setTranscript("Permission Error: Microphone access blocked.");
        } else if (event.error === 'network') {
          speak("Network error. Please check your connection.");
        } else {
          speak("I'm having trouble hearing you. Please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        console.log("Jarvis: Voice recognition ended.");
        setIsListening(false);
      };
    } else {
      console.warn("Jarvis: Speech Recognition API not supported in this browser.");
    }
  }, []);

  const handleCommand = async (command: string) => {
    if (!command.trim()) return;
    
    setIsLoading(true);
    setResponse("Analyzing command context...");
    
    try {
      console.log("Jarvis: Sending command to core...", command);
      const res = await fetch('/api/jarvis/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: command,
          userId: profile?.uid || 'anonymous',
          role: profile?.role || 'resident'
        })
      });

      if (res.status === 429) {
        speak("I am currently experiencing a high volume of requests. Please standby for a moment.");
        setIsLoading(false);
        return;
      }

      if (res.status === 401 || res.status === 500) {
        speak("My neural core is restricted. Please ensure the Gemini API key is correctly configured in the system environment variables.");
        setTranscript("System Configuration Error");
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      console.log("Jarvis: Core response received:", data);
      
      if (data.response) {
        speak(data.response);
      }

      if (onCommand) {
        onCommand(command, data.action, data.payload);
      }
    } catch (error) {
      console.error("Jarvis: Command execution failed:", error);
      speak("System error. My connection to the central core has been interrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    try {
      setResponse(text);
      // Cancel previous speech to avoid "Uncaught" errors
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (jarvisVoice) {
        utterance.voice = jarvisVoice;
      }
      
      utterance.rate = 1.05; // Slightly faster for a modern AI feel
      utterance.pitch = 0.85; // Deep, calm tones like Paul Bettany
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error("Jarvis: Speech synthesis error", e);
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Jarvis: Could not speak", err);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="fixed bottom-24 right-5 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-72 bg-[#0F172A]/95 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)] overflow-hidden"
          >
            {/* Energy Core Background Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Jarvis v1.0</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 min-h-[60px]">
                <p className="text-[10px] text-cyan-500/50 uppercase font-bold mb-1">User Input</p>
                <p className="text-sm text-gray-300 italic">
                  {transcript || "Waiting for voice command..."}
                </p>
              </div>

              <div className="bg-cyan-500/5 rounded-lg p-3 border border-cyan-500/20 min-h-[60px]">
                <p className="text-[10px] text-cyan-400 uppercase font-bold mb-1">Jarvis Response</p>
                <p className="text-sm text-white font-medium">
                  {response || "System standby. Awaiting instructions."}
                </p>
              </div>

              <div className="flex justify-center py-2">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`relative group ${isListening || isLoading ? 'scale-110' : ''} transition-all duration-300 disabled:opacity-50`}
                >
                  {/* Outer Rings */}
                  {isListening && (
                    <motion.div
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full border-2 border-cyan-500"
                    />
                  )}
                  
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isListening ? 'bg-cyan-500 border-white text-white' : 'bg-black/60 border-cyan-500/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-900/20'}`}>
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={28} />
                    ) : (
                      <Mic size={28} />
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-2 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield size={10} /> <span>Admin Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap size={10} /> <span>Low Latency</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-16 h-16 rounded-full bg-[#0F172A] border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center overflow-hidden"
      >
        {/* Animated Background Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-tr transition-colors duration-500 ${isSpeaking ? 'from-cyan-400/40 via-cyan-900/40' : 'from-cyan-900/40'} to-transparent animate-pulse`} />
        
        {/* Neural Waveform (Speaking Indicator) */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [4, 24, 4],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.5 + (i * 0.1),
                  ease: "easeInOut" 
                }}
                className="w-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            ))}
          </div>
        )}

        {/* Scanning Line */}
        <motion.div 
          animate={{ y: [-32, 32] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute w-full h-[1px] bg-cyan-400/30 blur-[1px]"
        />

        <div className="relative flex flex-col items-center">
          <Zap size={24} className="text-cyan-400" />
          <span className="text-[8px] font-bold text-cyan-400 mt-0.5 tracking-tighter uppercase">Jarvis</span>
        </div>
      </motion.button>
    </div>
  );
};
