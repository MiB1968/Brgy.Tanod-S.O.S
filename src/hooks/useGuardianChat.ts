// src/hooks/useGuardianChat.ts
import { useState, useEffect, useCallback } from 'react';
import { guardianAI, type ChatMessage } from '../services/guardianAI';
import socket from '../lib/socket';
import { soundService } from '../services/soundService';

export function useGuardianChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Crisis detection listener
  useEffect(() => {
    const handleCrisis = (e: any) => {
      const { type, level, transcript } = e.detail;
      console.log(`[GuardianChat] Crisis detected: ${type} (${level})`);
      
      // Auto-emit spike via socket
      socket.emit('guardian:priority_spike', { type, level, transcript });
      
      // Visual/Audio feedback
      soundService.play('alert_emergency');
    };

    window.addEventListener('guardian-crisis-detected', handleCrisis);
    return () => window.removeEventListener('guardian-crisis-detected', handleCrisis);
  }, []);

  // Initialize and load history from Dexie database
  useEffect(() => {
    const loadInitialHistory = async () => {
      try {
        const history = await guardianAI.loadHistory();
        if (history && history.length > 0) {
          setMessages(history.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp)
          })));
        } else {
          // Seed welcome message
          const welcome: ChatMessage = {
            role: 'assistant',
            content: "Kumusta! Ako si **Guardian AI** — iyong offline emergency assistant. Paano kita matutulungan ngayon?",
            timestamp: new Date()
          };
          setMessages([welcome]);
          await guardianAI.saveMessage(welcome.role, welcome.content);
        }
      } catch (err) {
        console.error("Failed to load Dexie chat history in hook:", err);
        setMessages([
          {
            role: 'assistant',
            content: "Kumusta! Ako si **Guardian AI** — iyong offline emergency assistant. Paano kita matutulungan ngayon?",
            timestamp: new Date()
          }
        ]);
      }
    };

    loadInitialHistory();
  }, []);

  const sendMessage = async (input: string, shouldSpeak: boolean = true) => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      content: input, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    await guardianAI.saveMessage('user', input);

    setIsThinking(true);
    const currentInput = input;

    try {
      let responseText = "";
      
      const response = await guardianAI.generateResponse(currentInput, (token) => {
        responseText += token;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: responseText, timestamp: last.timestamp }];
          }
          return [...prev, { role: 'assistant', content: responseText, timestamp: new Date() }];
        });
      });

      await guardianAI.saveMessage('assistant', response);
      
      if (shouldSpeak) {
        guardianAI.speak(response);
      }
    } catch (err) {
      console.error("Error generating Guardian response:", err);
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: "Paumanhin, nagkaroon ng error sa pagproseso ng iyong hiling. Siguraduhing na-load ang AI model.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
      await guardianAI.saveMessage('assistant', errMsg.content);
    } finally {
      setIsThinking(false);
    }
  };

  const clearConversation = async () => {
    if (!confirm("Gusto mo bang burahin ang lahat ng chat history?")) return;
    
    await guardianAI.clearCurrentSession();
    
    const clearedMsg: ChatMessage = {
      role: 'assistant',
      content: "✅ Burado na ang chat history. Paano kita matutulungan muli?",
      timestamp: new Date()
    };
    setMessages([clearedMsg]);
    await guardianAI.saveMessage('assistant', clearedMsg.content);
  };

  return { messages, sendMessage, clearConversation, isThinking };
}
