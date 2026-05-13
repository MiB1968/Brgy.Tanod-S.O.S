
/**
 * Professional Audio Utilities for Tactical Interfaces
 */
export const audioUtils = {
  /**
   * Unlocks audio context on mobile devices after user interaction
   */
  kickstartAudio() {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    // Play a silent sound to unlock speechSynthesis if needed
    const utterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(utterance);
  },

  /**
   * Analyzes an audio stream for visualizer data
   */
  createVisualizer(stream: MediaStream, onData: (data: Uint8Array) => void) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 64;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let isRunning = true;
    
    const tick = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      onData(new Uint8Array(dataArray));
      requestAnimationFrame(tick);
    };
    
    tick();
    
    return {
      stop: () => {
        isRunning = false;
        source.disconnect();
        audioContext.close();
      }
    };
  }
};
