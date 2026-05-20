// src/hooks/useGuardianChat.ts
import { useState, useEffect } from 'react';
import { guardianAI, type ChatMessage } from '../services/guardianAI';

const DB_NAME = "GuardianAI_ChatHistory_DB";
const STORE_NAME = "chatMessagesHistory";

export function useGuardianChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  // Initialize DB and load history
  useEffect(() => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = (e: any) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = (e: any) => {
        const database = e.target.result;
        setDb(database);
        
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const loadedMessages = getAllRequest.result || [];
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages.map((m: any) => ({
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
            
            // Save welcome
            const tx = database.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).add({
              role: welcome.role,
              content: welcome.content,
              timestamp: welcome.timestamp.toISOString()
            });
          }
        };
      };

      request.onerror = (e) => {
        console.error("Failed to open IndexedDB for GuardianAI chat history:", e);
        // Fallback to memory
        setMessages([
          {
            role: 'assistant',
            content: "Kumusta! Ako si **Guardian AI** — iyong offline emergency assistant. Paano kita matutulungan ngayon?",
            timestamp: new Date()
          }
        ]);
      };
    } catch (err) {
      console.error("IndexedDB open error catches:", err);
      setMessages([
        {
          role: 'assistant',
          content: "Kumusta! Ako si **Guardian AI** — iyong offline emergency assistant. Paano kita matutulungan ngayon?",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  const saveMessageToDB = (msg: ChatMessage) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      });
    } catch (e) {
      console.error("Could not append msg to IndexedDB:", e);
    }
  };

  const sendMessage = async (input: string, shouldSpeak: boolean = true) => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      content: input, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    saveMessageToDB(userMsg);

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

      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: response, 
        timestamp: new Date() 
      };
      
      saveMessageToDB(assistantMsg);
      
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
      saveMessageToDB(errMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const clearConversation = () => {
    if (!confirm("Gusto mo bang burahin ang lahat ng chat history?")) return;
    
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
      } catch (e) {
        console.error("Failed to clear store", e);
      }
    }
    
    const clearedMsg: ChatMessage = {
      role: 'assistant',
      content: "✅ Burado na ang chat history. Paano kita matutulungan muli?",
      timestamp: new Date()
    };
    setMessages([clearedMsg]);
    saveMessageToDB(clearedMsg);
  };

  return { messages, sendMessage, clearConversation, isThinking };
}
