import React, { useState, useEffect, useRef } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { SOSChatMessage, User } from "../types";
import {
  Send,
  MessageSquare,
  Shield,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

interface SOSChatProps {
  alertId: string;
  currentUser: User;
}

export const SOSChat: React.FC<SOSChatProps> = ({ alertId, currentUser }) => {
  const [messages, setMessages] = useState<SOSChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!alertId) return;

    const loadMessages = async () => {
      try {
        const msgs = await api.chat.getMessages(alertId);
        setMessages(Array.isArray(msgs) ? msgs : []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load chat messages", err);
        setLoading(false);
      }
    };

    loadMessages();

    const handleNewMessage = (data: any) => {
      if (data.alertId === alertId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    };

    socket.on("sos_chat_message", handleNewMessage);

    return () => {
      socket.off("sos_chat_message", handleNewMessage);
    };
  }, [alertId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setNewMessage("");

    try {
      await api.chat.sendMessage(alertId, msgData);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-brand-bg/50 border border-white/5 rounded-2xl overflow-hidden glass-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-brand-bg/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-info" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60 font-mono">
            Tactical Comms
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[8px] font-mono text-success font-bold uppercase">
            SECURE LINK
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-tactical"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-info animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-2">
            <Shield className="w-8 h-8" />
            <p className="text-[10px] font-mono uppercase font-black">
              No signals detected
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{
                opacity: 0,
                x: msg.senderId === currentUser.uid ? 10 : -10,
              }}
              animate={{ opacity: 1, x: 0 }}
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.senderId === currentUser.uid
                  ? "ml-auto items-end"
                  : "mr-auto items-start",
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {msg.senderRole === "tanod" || msg.senderRole === "admin" ? (
                  <Shield className="w-3 h-3 text-info" />
                ) : (
                  <UserIcon className="w-3 h-3 text-white/40" />
                )}
                <span className="text-[9px] font-mono font-black uppercase text-white/40">
                  {msg.senderName}
                  <span
                    className={cn(
                      "ml-1 opacity-50 px-1 border border-white/10 rounded",
                      msg.senderRole === "tanod"
                        ? "text-info border-info/30"
                        : "text-white/40",
                    )}
                  >
                    {msg.senderRole}
                  </span>
                </span>
              </div>
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-lg",
                  msg.senderId === currentUser.uid
                    ? "bg-info text-white rounded-tr-none"
                    : "bg-white/5 text-white/90 border border-white/5 rounded-tl-none",
                )}
              >
                {msg.message}
              </div>
              <span className="text-[8px] font-mono text-white/20 mt-1 uppercase tracking-tighter">
                {format(new Date(msg.timestamp), "HH:mm:ss")}
              </span>
            </motion.div>
          ))
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={sendMessage}
        className="p-4 bg-brand-bg/30 border-t border-white/5"
      >
        <div className="relative group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type tactical update..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-info/50 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-2 p-1.5 bg-info text-white rounded-lg hover:bg-info/80 transition-all disabled:opacity-30 disabled:grayscale"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
