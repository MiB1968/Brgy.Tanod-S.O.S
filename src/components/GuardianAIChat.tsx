// src/components/GuardianAIChat.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Settings as SettingsIcon, Mic, MicOff, Trash2 } from 'lucide-react';
import { guardianAI } from '../services/guardianAI';
import GuardianAISettings from './GuardianAISettings';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function GuardianAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Kumusta! Ako si **Guardian AI** — iyong offline emergency assistant. Paano kita matutulungan ngayon?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // WebLLM Progress Event Listener
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.type === 'progress') {
        const prog = Math.round(e.detail.payload.progress);
        setLoadingProgress(prog);
      }
    };
    window.addEventListener('guardian-ai-event', handler);
    return () => window.removeEventListener('guardian-ai-event', handler);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleVoiceInput = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Unsupported Speech recognition in current browser. Try Microsoft Edge or Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.lang = 'tl-PH'; // Native Filipino
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        if (result) {
          setInput(prev => (prev ? prev + ' ' : '') + result);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const clearMessages = () => {
    if (confirm("Gusto mo bang burahin ang chat history?")) {
      setMessages([
        { 
          role: 'assistant', 
          content: "Kumusta! Ako si **Guardian AI** — handang maglingkod sa inyong komunidad offline." 
        }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = input;
    setInput('');
    setIsThinking(true);

    let responseText = "";

    try {
      await guardianAI.generateResponse(currentPrompt, (token) => {
        responseText += token;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: responseText }];
          }
          return [...prev, { role: 'assistant', content: responseText }];
        });
      });

      // Play Filipino Voice output dynamically
      guardianAI.speak(responseText);
    } catch (error) {
      console.error("WebLLM generation error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Paumanhin, may kaunting problema sa aking tagapagsalin. Siguraduhing na-load muna ang model." 
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {/* Floating Tactical Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-600 w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-2xl z-40 hover:scale-110 active:scale-95 transition-all border-4 border-white/20 hover:shadow-purple-500/20"
        title="Guardian AI - Offline Assistant"
        id="guardian-ai-floating-trigger"
      >
        🤖
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[520px] bg-[#0a1428] border border-purple-500/30 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/80 to-[#0a1428]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center border border-purple-500/30">
                <Bot className="text-purple-400 w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-white text-base">Guardian AI</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                  <p className="text-[10px] text-green-400 font-mono uppercase tracking-wider font-semibold">Offline Core</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={clearMessages}
                className="p-1.5 hover:bg-white/5 rounded-xl transition text-gray-400 hover:text-red-400"
                title="Sariwain Chat"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 hover:bg-white/5 rounded-xl transition text-gray-400 hover:text-white"
                title="AI Settings"
              >
                <SettingsIcon size={18} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-xl transition text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Model Load Warning / Status Progress bar */}
          {loadingProgress > 0 && loadingProgress < 100 && (
            <div className="px-4 py-2 bg-purple-950/35 text-xs border-b border-purple-500/10">
              <div className="text-purple-400 mb-1 flex justify-between font-mono">
                <span>Downloading WebLLM locally...</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          )}

          {/* Chat Timeline body */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar bg-slate-950/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none' 
                      : 'bg-slate-900 border border-white/5 text-gray-100 rounded-tl-none shadow'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-purple-400 text-xs pl-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span>Naglo-load ng sagot si Guardian AI...</span>
              </div>
            )}
          </div>

          {/* Prompt Entry block */}
          <div className="p-4 border-t border-white/10 bg-[#0a1428]">
            <div className="flex gap-2">
              <button 
                onClick={toggleVoiceInput}
                className={`p-3 rounded-2xl border transition-all ${
                  isListening 
                    ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Tagalog Speech input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isListening ? "Nakikinig..." : "I-type ang tanong pangkasalan..."}
                className="flex-1 bg-slate-950/80 border border-white/15 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition"
                disabled={isThinking}
              />
              
              <button
                onClick={sendMessage}
                disabled={isThinking || !input.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 text-white p-3 rounded-2xl transition shadow-lg flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center font-mono text-[9px] text-gray-500 mt-2 tracking-wide uppercase">
              WebGPU Engine • Intel/AMD/NVIDIA & Apple silicon supported
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <GuardianAISettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}
