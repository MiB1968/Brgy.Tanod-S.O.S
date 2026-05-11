import { useState, useCallback, useEffect, useRef } from 'react';
import { voiceService } from '../services/voiceService';
import { soundService } from '../services/soundService';
import { guardianAI } from '../services/guardianAIService';
import { useAuthStore } from '../store/useAuthStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { VoiceState } from '../types/voice';
import { toast } from 'react-hot-toast';

export function useGuardianAI() {
  const { profile } = useAuthStore();
  const { alerts } = useIncidentStore();
  const { patrols } = useTanodStore();
  
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    isAwake: false
  });

  const transcriberTimeout = useRef<NodeJS.Timeout | null>(null);

  const pendingSOS = alerts.filter(a => a.status === 'pending').length;
  const activeTanods = patrols.length;

  /**
   * Professional Greeting Sequence
   */
  const performGreeting = useCallback((role: string, name: string) => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    // Check for Ruben Llego (Owner)
    const isOwner = name.toUpperCase().includes('RUBEN LLEGO') || profile?.email === 'rubenlleg12@gmail.com';

    if (isOwner) {
      soundService.play('intro_super');
      setTimeout(() => {
        voiceService.speak(`Welcome back, System Owner and Creator, Ruben Llego. Full system access granted. Guardian AI is at your command.`);
        toast.success("SUPER ADMIN AUTHENTICATED: Full Tactical Oversight Active", { duration: 5000 });
        setState(s => ({ ...s, isAwake: true }));
      }, 1000);
      return;
    }

    // Standard Admin/Tanod Greeting
    if (['ADMIN', 'CAPTAIN', 'TANOD'].includes(role.toUpperCase())) {
      soundService.play('intro_epic');
      setTimeout(() => {
        voiceService.speak(`${timeGreeting}, Commissioner ${name}. System online and ready for coordination.`);
        setState(s => ({ ...s, isAwake: true }));
      }, 800);
    }
  }, [profile]);

  const processText = useCallback(async (text: string) => {
    const isOwner = profile?.name?.toUpperCase().includes('RUBEN LLEGO') || profile?.email === 'rubenlleg12@gmail.com';
    
    const result = await guardianAI.processCommand(text, {
      pendingSOS,
      activeTanods,
      isSuperAdmin: isOwner
    });

    setState(s => ({ ...s, isSpeaking: true }));
    voiceService.speak(result.reply, () => {
      setState(s => ({ ...s, isSpeaking: false }));
    });

    if (result.action === 'UNLOCK_SUPER_ADMIN') {
      // Custom logic for unlocking if needed
      toast.success("Super User Privileges Synchronized");
    }
  }, [pendingSOS, activeTanods, profile]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const isOwner = profile?.name?.toUpperCase().includes('RUBEN LLEGO') || profile?.email === 'rubenlleg12@gmail.com';
    
    setState(s => ({ ...s, isProcessing: true }));
    try {
      const response = await guardianAI.processCommand(text, {
        pendingSOS,
        activeTanods,
        isSuperAdmin: isOwner
      });

      setState(s => ({ ...s, lastTranscript: text }));
      
      voiceService.speak(response.reply, () => {
        setState(s => ({ ...s, isSpeaking: false }));
      });
      
      setState(s => ({ 
        ...s, 
        isAwake: true, 
        isSpeaking: true, 
        isProcessing: false,
        action: response.action 
      }));
    } catch (err) {
      console.error('[Guardian AI] Chat Error:', err);
      setState(s => ({ ...s, isProcessing: false }));
      toast.error("Guardian AI communication link failure.");
    }
  }, [pendingSOS, activeTanods, profile]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      if (transcriberTimeout.current) clearTimeout(transcriberTimeout.current);
      voiceService.stopListening();
      setState(s => ({ ...s, isListening: false }));
    } else {
      soundService.play('voice_beep');
      setState(s => ({ ...s, isListening: true }));

      // Safety timeout: stop listening after 25 seconds of silence or inactivity
      if (transcriberTimeout.current) clearTimeout(transcriberTimeout.current);
      transcriberTimeout.current = setTimeout(() => {
        if (state.isListening) {
          voiceService.stopListening();
          setState(s => ({ ...s, isListening: false }));
          toast("Voice mode suspended for battery safety.", { icon: '🔋' });
        }
      }, 25000);

      voiceService.startListening(
        (text, isFinal) => {
          if (isFinal) {
            processText(text);
            // Reset timeout on activity
            if (transcriberTimeout.current) clearTimeout(transcriberTimeout.current);
            transcriberTimeout.current = setTimeout(() => {
              voiceService.stopListening();
              setState(s => ({ ...s, isListening: false }));
            }, 15000);
          }
        },
        (err) => {
          setState(s => ({ ...s, isListening: false, error: err.error }));
          
          if (err.error === 'not-allowed') {
            toast.error("Microphone access denied. Please enable it in your browser settings to use Guardian AI.", {
              duration: 5000,
              icon: '🎙️'
            });
          } else if (err.error !== 'aborted') {
            toast.error("Guardian AI connectivity interrupted. Switching to manual.");
          }
        }
      );
    }
  }, [state.isListening, processText]);

  // Proactive suggestions for Admin (e.g. status)
  useEffect(() => {
    if (state.isAwake && !state.isSpeaking && !state.isListening) {
      const timer = setTimeout(() => {
        const suggestion = guardianAI.getProactiveSuggestion({ pendingSOS, activeTanods });
        if (suggestion) {
          setState(s => ({ ...s, isSpeaking: true }));
          voiceService.speak(suggestion, () => {
            setState(s => ({ ...s, isSpeaking: false }));
          });
        }
      }, 5000); // Wait 5s before suggesting anything proactively
      
      return () => clearTimeout(timer);
    }
  }, [pendingSOS, activeTanods, state.isAwake, state.isListening, state.isSpeaking]);

  useEffect(() => {
    return () => {
      if (transcriberTimeout.current) clearTimeout(transcriberTimeout.current);
      voiceService.stopListening();
    };
  }, []);

  return {
    ...state,
    toggleListening,
    performGreeting,
    sendMessage
  };
}
