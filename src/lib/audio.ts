export function playSiren() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime + startTime);
      oscillator.stop(audioCtx.currentTime + startTime + duration);
    };

    // Play a dual-tone wailing siren effect (e.g. European style)
    for (let i = 0; i < 3; i++) {
      playTone(800, i * 1.0, 0.5); // High tone
      playTone(600, i * 1.0 + 0.5, 0.5); // Low tone
    }
  } catch (e) {
    console.error("Audio Context not supported or failed to initialize", e);
  }
}

export function playSuccessNotification() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime + startTime);
      oscillator.stop(audioCtx.currentTime + startTime + duration);
    };

    // Upward arpeggio indicating positive response
    playTone(523.25, 0.0, 0.15); // C5
    playTone(659.25, 0.15, 0.15); // E5
    playTone(783.99, 0.3, 0.3); // G5
  } catch (e) {
    console.error("Audio Context not supported or failed to initialize", e);
  }
}
