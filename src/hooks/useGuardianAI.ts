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

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      voiceService.stopListening();
      setState(s => ({ ...s, isListening: false }));
    } else {
      soundService.play('voice_beep');
      setState(s => ({ ...s, isListening: true }));
      voiceService.startListening(
        (text, isFinal) => {
          if (isFinal) {
            processText(text);
          }
        },
        (err) => {
          setState(s => ({ ...s, isListening: false, error: err.message }));
          toast.error("Voice synthesis interrupted. Retrying...");
        }
      );
    }
  }, [state.isListening, processText]);

  // Proactive suggestions
  useEffect(() => {
    if (state.isAwake && !state.isSpeaking && !state.isListening) {
      const suggestion = guardianAI.getProactiveSuggestion({ pendingSOS, activeTanods });
      if (suggestion && Math.random() > 0.8) { // Only occasionally suggest
        voiceService.speak(suggestion);
      }
    }
  }, [pendingSOS, activeTanods, state.isAwake]);

  return {
    ...state,
    toggleListening,
    performGreeting
  };
}
