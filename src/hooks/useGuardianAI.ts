import { useState, useCallback } from 'react';
import { useAudioSystem } from './useAudioSystem';

export const useGuardianAI = () => {
  const [isListening, setIsListening] = useState(false);
  const { speak, playSiren } = useAudioSystem();

  const startVoiceRecognition = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      speak("Voice recognition is not supported.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fil-PH';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      processCommand(command);
    };
    recognition.start();
  }, [speak]);

  const processCommand = (command: string) => {
    const lower = command.toLowerCase();
    if (lower.includes("sos") || lower.includes("tulong")) {
      speak("SOS activated!");
      playSiren(4000);
    } else {
      speak("How can I help?");
    }
  };
  return { isListening, startVoiceRecognition, speak };
};
