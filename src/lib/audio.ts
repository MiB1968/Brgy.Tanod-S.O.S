
/**
 * Professional Audio Utilities for Tactical Interfaces
 */
export const audioUtils = {
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
