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
  
  const recognitionRef = useRef<any>(null);
  const { userProfile } = useAuthStore();

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
          handleCommand(transcriptText.toLowerCase());
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleCommand = async (command: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jarvis/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: command,
          userId: userProfile?.uid || 'anonymous',
          role: userProfile?.role || 'resident'
        })
      });

      const data = await res.json();
      
      if (data.response) {
        speak(data.response);
      }

      if (onCommand) {
        onCommand(command, data.action, data.payload);
      }
    } catch (error) {
      console.error("Jarvis command failed:", error);
      speak("System error. Connection to Jarvis core lost.");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    setResponse(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // More deep "Jarvis" like pitch
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
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
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 to-transparent animate-pulse" />
        
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
