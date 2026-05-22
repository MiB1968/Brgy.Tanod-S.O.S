import { useRef } from 'react';

export const useAudioSystem = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSiren = (duration: number = 5000) => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    gain.gain.value = 0.3;
    oscillator.connect(gain);
    gain.connect(audioContextRef.current.destination);
    oscillator.start();
    setTimeout(() => oscillator.stop(), duration);
  };

  const speak = (text: string, lang: string = 'fil-PH') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  return { playSiren, speak };
};
