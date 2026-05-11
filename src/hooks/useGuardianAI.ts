import { useState, useCallback, useEffect } from 'react';
import { voiceAssistant } from '../services/voiceAssistantService';
import { soundService } from '../services/soundService';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';

export function useGuardianAI() {
  const { profile } = useAuthStore();
  const [isAwake, setIsAwake] = useState(false);

  /**
   * Professional Greeting Sequence
   */
  const performGreeting = useCallback((role: string, name: string) => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    // THE "RUBEN LLEGO" PROTOCOL
    if (name.toUpperCase().includes('RUBEN LLEGO') || profile?.email === 'rubenlleg12@gmail.com') {
      soundService.play('intro_super');
      setTimeout(() => {
        voiceAssistant.speak(`Welcome back, System Owner and Creator, Ruben Llego. Full system access granted. Guardian AI is at your command.`);
        toast.success("SUPER ADMIN AUTHENTICATED: Full Tactical Oversight Active", { duration: 5000 });
      }, 1000);
      return;
    }

    // Standard Admin/Tanod Greeting
    if (['ADMIN', 'CAPTAIN', 'TANOD'].includes(role.toUpperCase())) {
      soundService.play('intro_epic');
      setTimeout(() => {
        voiceAssistant.speak(`${timeGreeting}, Commissioner ${name}. System online and ready for coordination.`);
      }, 800);
    }
  }, [profile]);

  const wakeUp = useCallback(() => {
    if (isAwake) return;
    soundService.play('voice_beep');
    setIsAwake(true);
    voiceAssistant.speak("Guardian AI standing by.");
  }, [isAwake]);

  const standBy = useCallback(() => {
    setIsAwake(false);
    voiceAssistant.disconnect();
  }, []);

  return {
    isAwake,
    wakeUp,
    standBy,
    performGreeting
  };
}
