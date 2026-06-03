// src/hooks/useGuardian.ts
import { useCallback, useRef, useEffect } from 'react';
import { useGuardianStore } from '../store/useGuardianStore';
import { voiceService } from '../services/voiceService';
import { useTTS } from './useTTS';
import { soundService } from '../services/soundService';
import { useAuthStore } from '../store/useAuthStore';
import socket from '../lib/socket';
import { toast } from 'react-hot-toast';
import { aiService } from '../services/aiService';
import { guardianAI } from '../services/guardianAI';

export function useGuardian() {
  const { 
    status, 
    transcript, 
    setStatus, 
    setTranscript, 
    setLastResponse, 
    setEmergency, 
    setError, 
    reset 
  } = useGuardianStore();
  
  const { profile } = useAuthStore();
  const recognitionRef = useRef<any>(null);
  const offlineQueue = useRef<string[]>([]);
  const synth = window.speechSynthesis;
  const { speak: ttsSpeak } = useTTS();

  // Listen for monitoring events (for responders)
  useEffect(() => {
    const handleMonitor = (data: any) => {
      if (['ADMIN', 'SUPERADMIN', 'CAPTAIN', 'TANOD'].includes(profile?.role?.toUpperCase() || '')) {
        toast(`Guardian: ${data.userName} - ${data.transcript}`, { 
          icon: '🎧',
          id: `monitor-${data.userId}`,
          duration: data.isFinal ? 3000 : 1000
        });
      }
    };

    socket.on('guardian:monitor_transcript', handleMonitor);
    return () => {
      socket.off('guardian:monitor_transcript', handleMonitor);
    };
  }, [profile]);

  // Sync offline queue when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (offlineQueue.current.length > 0) {
        console.log(`[Guardian] Syncing ${offlineQueue.current.length} offline commands`);
        offlineQueue.current.forEach(text => {
          socket.emit('voice-command', { transcript: text, isOfflineSync: true });
        });
        offlineQueue.current = [];
        toast.success("Guardian synced offline records");
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const speak = useCallback(async (text: string, audioBase64?: string) => {
    setStatus('RESPONDING');
    setLastResponse(text);
    // Use offline TTS capabilities directly
    await ttsSpeak({ text, language: 'en' });
    // If we're not listening again, go back to IDLE
    setStatus('IDLE');
  }, [setStatus, setLastResponse, ttsSpeak]);

  const handleDeterministicCommand = useCallback((text: string): boolean => {
    const input = text.toLowerCase();

    // 1. FIRE / SUNOG
    if (/fire|sunog|apoy/i.test(input)) {
        soundService.play('alert_emergency');
        setEmergency(true);
        speak("Fire emergency detected. Alerting BFP and local responders immediately. Please evacuate.");
        socket.emit('guardian:priority_spike', { type: 'FIRE', level: 'CRITICAL', transcript: text });
        return true;
    }

    // 2. SOS / SAKLOLO
    if (/sos|help|tulong|saklolo|emergency/i.test(input)) {
        soundService.play('sos_alarm');
        setEmergency(true);
        speak("SOS acknowledged. Coordinating immediate response. Stay calm.");
        socket.emit('guardian:priority_spike', { type: 'SOS', level: 'HIGH', transcript: text });
        return true;
    }

    // 3. STOP / QUIET
    if (/stop|hinto|tigil|quiet|shut up/i.test(input)) {
        synth.cancel();
        setStatus('IDLE');
        return true;
    }

    return false;
  }, [setStatus, setEmergency, speak, synth]);

  const askGuardian = useCallback(async (userText: string): Promise<string> => {
    setStatus('PROCESSING');

    try {
        const response = await guardianAI.generateResponse(userText);
        return response || "I'm monitoring the situation. Stay calm, help is on the way.";
    } catch (err) {
        console.error("Guardian AI local generation failed, falling back to legacy command routing:", err);
        try {
            const res = await aiService.getGuardianResponse(userText);
            return res.response || "I'm monitoring the situation. Stay calm, help is on the way.";
        } catch (fbErr) {
            console.error("All AI strategies exhausted:", fbErr);
            return "I'm monitoring the situation. Stay calm, help is on the way.";
        }
    }
  }, [setStatus]);

  const startListening = useCallback(async () => {
    if (recognitionRef.current) return;

    // Mobile Battery Management
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        if (battery.level < 0.1 && !battery.charging) {
          toast.error("Low battery. Voice Guardian disabled to save power.", { id: 'battery-low' });
          return;
        }
      } catch (e) {}
    }

    soundService.play('voice_beep');
    setStatus('LISTENING');
    setError(null);

    recognitionRef.current = voiceService.startListening(
      async (text, isFinal) => {
        setTranscript(text);
        
        // Realtime streaming to dispatchers
        socket.emit('guardian:live_transcript', { transcript: text, isFinal });

        if (isFinal) {
          // 1. Zero-Latency Regex Router
          const handled = handleDeterministicCommand(text);
          if (handled) return;

          // 2. Probabilistic AI Router with Fail-Safe
          const aiResponse = await askGuardian(text);
          speak(aiResponse);
        }
      },
      (err) => {
        console.error('[Guardian] Recognition Error:', err);
        setStatus('ERROR');
        setError(err.message || 'Microphone error');
        recognitionRef.current = null;
      }
    );
  }, [setStatus, setTranscript, setError, handleDeterministicCommand, speak, askGuardian]);


  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      voiceService.stopListening(recognitionRef.current);
      recognitionRef.current = null;
      setStatus('IDLE');
    }
  }, [setStatus]);

  const performGreeting = useCallback((role: string, name: string) => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    if (['ADMIN', 'SUPERADMIN', 'CAPTAIN', 'TANOD', 'RESIDENT'].includes(role.toUpperCase())) {
      const isResident = role.toUpperCase() === 'RESIDENT';
      if (isResident) {
        speak(`Magandang ${hour < 12 ? 'umaga' : hour < 18 ? 'hapon' : 'gabi'}, ${name}. Nakabantay ang Guardian AI para sa iyong kaligtasan.`);
      } else {
        soundService.play('intro_epic');
        setTimeout(() => {
          speak(`${timeGreeting}, Commander ${name}. System online and ready for coordination.`);
        }, 1000);
      }
    }
  }, [speak]);

  return {
    status,
    transcript,
    isListening: status === 'LISTENING',
    startListening,
    stopListening,
    performGreeting,
    reset,
    speak,
    setTranscript,
    setStatus
  };
}
