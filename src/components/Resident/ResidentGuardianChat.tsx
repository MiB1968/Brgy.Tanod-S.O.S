import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Shield,
  HelpCircle,
  HardDrive,
} from "lucide-react";
import { guardianAI } from "../../services/guardianAIService";
import { isWebLLMReady } from "../../lib/webllm";

interface Message {
  id: string;
  text: string;
  sender: "user" | "guardian";
  timestamp: Date;
}

export const ResidentGuardianChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Magandang araw! Ako si Guardian. Paano kita matutulungan sa kaligtasan ng ating Barangay?",
      sender: "guardian",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      if (isWebLLMReady()) {
        const context = { pendingSOS: 0, activeTanods: 5, isSuperAdmin: false };
        const response = await guardianAI.processCommand(input, context);

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response.reply,
          sender: "guardian",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setTimeout(() => {
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: "Pasensya na, pinaghahandaan ko pa ang aking kaalaman (AI model loading). Maaari kang tumawag sa hotline kung may emergency.",
            sender: "guardian",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
        }, 1000);
        return;
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-900/40 z-[90] border-2 border-white/20"
      >
        <Bot className="text-white w-7 h-7" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0f1c] animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[calc(100vw-48px)] sm:w-96 h-[500px] bg-[#0d121f] border border-white/10 rounded-3xl shadow-2xl z-[100] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900 to-blue-950 p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shadow-inner">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black italic text-sm tracking-tighter uppercase">
                    Guardian Bot
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <span className="text-[10px] text-cyan-200/60 font-mono tracking-widest uppercase">
                      Secured & Offline
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      m.sender === "user"
                        ? "bg-cyan-600 text-white rounded-tr-none"
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-1 opacity-40 font-mono ${
                        m.sender === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {m.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce delay-75" />
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-white/5">
              <button
                onClick={() => setInput("Paano ang first aid sa sugat?")}
                className="flex-shrink-0 text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                🩹 First Aid Guide
              </button>
              <button
                onClick={() => setInput("Ano ang main hotline ng barangay?")}
                className="flex-shrink-0 text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                📞 Hotline Info
              </button>
              <button
                onClick={() => setInput("Mag-report ng gulo sa kanto.")}
                className="flex-shrink-0 text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                🚨 How to Report
              </button>
            </div>

            {/* Input */}
            <div className="p-4 bg-[#0a0f1c] border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Mag-tanong kay Guardian..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
