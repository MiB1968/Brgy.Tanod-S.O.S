import React, { useState, useEffect, useRef } from "react";
import { guardianAI } from "../services/guardianAIService";
import { isWebLLMReady } from "../lib/webllm";
import {
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  X,
  Settings,
  Brain,
  MessageSquare,
} from "lucide-react";
import { voiceService, VoiceOptions } from "../services/voiceService";
import { motion, AnimatePresence } from "motion/react";
import { VoiceWaveform } from "./ai/VoiceWaveform";

interface GuardianVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onSOS?: () => void;
  onCommand?: (action: string, transcript: string) => void;
}

const FilipinoVoices = [
  { id: "fil-PH-BlessicaNeural", label: "Blessica (Female)" },
  { id: "fil-PH-AngeloNeural", label: "Angelo (Male)" },
];

const GuardianVoiceTacticalAssistant: React.FC<GuardianVoiceAssistantProps> = ({
  isOpen,
  onClose,
  onSOS,
  onCommand,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("GUARDIAN AI ONLINE");
  const [error, setError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(voiceService.defaultVoice);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  const recognitionRef = useRef<any>(null);

  const speak = async (text: string, options: VoiceOptions = {}) => {
    setIsSpeaking(true);
    setStatus("Nagsasalita...");
    await voiceService.speak(text, { ...options, voice: selectedVoice });
    setIsSpeaking(false);
    setStatus("GUARDIAN AI ONLINE");
  };

  useEffect(() => {
    if (!isOpen) {
      stopAll();
      return;
    }
    setStatus("GUARDIAN AI ONLINE");
    setTranscript("");
    setError("");
  }, [isOpen]);

  const startListening = () => {
    const onResult = (text: string, isFinal: boolean) => {
      setTranscript(text);
      if (isFinal) {
        setStatus("Pinoproseso...");
        setIsThinking(true);
        processCommand(text);
      } else {
        setStatus(`Nakikinig...`);
      }
    };

    const onError = (err: any) => {
      setError("May problema sa mikropono");
      setTimeout(() => setError(""), 2500);
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
    setIsThinking(false);
  };

  const processCommand = async (text: string) => {
    try {
      if (isWebLLMReady()) {
        setStatus("Analysis sa Guardian AI...");
        const details = await guardianAI.extractSOSDetails(text);

        if (details.severity >= 4) {
          onSOS?.();
          await speak(
            `Grave ang sitwasyon. Type: ${details.type}. Lokasyon: ${details.location}. Naipadala na ang tactical response.`
          );
          setIsThinking(false);
          return;
        }

        const response = await guardianAI.processCommand(text, {
          pendingSOS: 0,
          activeTanods: 3,
          isSuperAdmin: true,
        });

        if (response.action === "SUGGEST_DISPATCH") {
          onCommand?.("dispatch", text);
        } else {
          onCommand?.("info", text);
        }

        setIsThinking(false);
        await speak(response.reply);
      } else {
        const isSOS = /sos|emergency|sakuna|tulungan|help|sunog/i.test(
          text.toLowerCase()
        );
        if (isSOS) {
          onSOS?.();
          await speak(
            "SOS! Naipadala na ang alert. Tumutugon na ang mga Tanod."
          );
        } else {
          onCommand?.("general", text);
          await speak(`Naintindihan ko: ${text}`);
        }
        setIsThinking(false);
      }
    } catch (e) {
      console.error("Voice process error:", e);
      setIsThinking(false);
      await speak(`Paki-ulit, hindi ko nakuha ang utos.`);
    }
  };

  const triggerSOS = () => {
    onSOS?.();
    speak("EMERGENCY SOS ACTIVATED! Lahat ng Tanod ay tinatawag.");
  };

  const testVoice = () => {
    speak(
      "Ako si Guardian. Test ng Filipino voice para sa Barangay Tanod S.O.S."
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0a0f1c] border border-cyan-500/40 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.2)]"
        >
          <div className="bg-gradient-to-r from-red-950/80 to-cyan-950/80 px-8 py-6 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <motion.div
                animate={isThinking ? { rotate: 360 } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 bg-gradient-to-br from-red-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg"
              >
                <Brain className="text-white w-6 h-6" />
              </motion.div>
              <div>
                <div className="text-white font-black italic tracking-tighter uppercase text-lg">
                  Guardian AI
                </div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase opacity-70">
                  Tactical Voice Core
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <Settings size={20} className="text-cyan-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showVoiceSelector && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 py-6 bg-white/5 border-b border-white/5 overflow-hidden"
              >
                <p className="text-[10px] font-mono text-gray-400 mb-3 tracking-widest uppercase">
                  Select Vocal Signature
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {FilipinoVoices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        selectedVoice === v.id
                          ? "bg-cyan-600 border-cyan-400 text-white shadow-glow-cyan"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`font-mono text-[10px] font-black tracking-[0.3em] uppercase py-1 px-4 rounded-full border ${
                  isListening
                    ? "text-red-400 border-red-500/30 bg-red-500/10"
                    : isSpeaking
                    ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                    : isThinking
                    ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
                    : "text-gray-500 border-white/10"
                }`}
              >
                {status}
              </div>

              <VoiceWaveform
                active={isListening || isSpeaking || isThinking}
                color={
                  isListening ? "#ef4444" : isThinking ? "#a855f7" : "#22d3ee"
                }
                count={8}
              />
            </div>

            <div className="min-h-[100px] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {transcript ? (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="italic bg-white/5 border border-white/10 p-6 rounded-[32px] text-gray-200 text-sm font-medium leading-relaxed max-w-full w-full shadow-inner relative"
                  >
                    <MessageSquare
                      size={16}
                      className="absolute -top-2 -left-2 text-cyan-500/40"
                    />
                    "{transcript}"
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-600 font-mono text-[10px] uppercase tracking-widest text-center"
                  >
                    Standing by for verbal interaction...
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-8 py-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking || isThinking}
                className="relative group disabled:opacity-50"
              >
                <div
                  className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${
                    isListening
                      ? "bg-red-500/40 scale-125"
                      : "bg-cyan-500/20 group-hover:bg-cyan-500/40"
                  }`}
                />
                <div
                  className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all bg-[#0a0f1c] relative z-10 ${
                    isListening
                      ? "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                      : "border-cyan-400 group-hover:border-white"
                  }`}
                >
                  {isListening ? (
                    <MicOff size={48} className="text-red-500" />
                  ) : (
                    <Mic
                      size={48}
                      className="text-cyan-400 group-hover:text-white transition-colors"
                    />
                  )}
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
              <button
                onClick={triggerSOS}
                className="bg-red-600 hover:bg-red-700 p-5 rounded-[24px] font-black italic tracking-tighter uppercase text-white flex flex-col items-center gap-2 group transition-all border-b-4 border-red-900"
              >
                <AlertTriangle
                  size={24}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-[10px]">Direct SOS</span>
              </button>
              <button
                onClick={testVoice}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-[24px] font-black italic tracking-tighter uppercase text-white/60 hover:text-white flex flex-col items-center gap-2 group transition-all border border-white/10"
              >
                <Volume2
                  size={24}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-[10px]">Test Signature</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuardianVoiceTacticalAssistant;
