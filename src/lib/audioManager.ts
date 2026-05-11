// src/lib/audioManager.ts

export class PCMPlayer {
    private ac: AudioContext;
    private nextTime: number = 0;
  
    constructor() {
      this.ac = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      console.log("[PCMPlayer] initialized");
    }
  
    public async playChunk(base64Chunk: string) {
      if (this.ac.state === 'suspended') {
         await this.ac.resume();
      }
      
      const buffer = Uint8Array.from(atob(base64Chunk), c => c.charCodeAt(0));
      const pcmData = new Int16Array(buffer.buffer);
      
      // Convert INT16 to Float32
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }
      
      const audioBuffer = this.ac.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      const source = this.ac.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.ac.destination);
      
      let startTime = this.nextTime;
      if (startTime < this.ac.currentTime) {
        startTime = this.ac.currentTime + 0.05; // slight buffer
      }
      
      source.start(startTime);
      this.nextTime = startTime + audioBuffer.duration;
    }

    public stop() {
        this.ac.close();
    }
}

export class PCMRecorder {
    private ac: AudioContext;
    private source!: MediaStreamAudioSourceNode;
    private processor!: ScriptProcessorNode;
    private stream!: MediaStream;
  
    constructor(private onData: (base64Str: string) => void) {
      this.ac = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
    }
  
    public async start() {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.ac.state === 'suspended') {
         await this.ac.resume();
      }
      this.source = this.ac.createMediaStreamSource(this.stream);
      // Older approach because AudioWorklet requires separate file or blob URL.
      this.processor = this.ac.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const float32Data = e.inputBuffer.getChannelData(0);
        // Convert Float32 to INT16
        const pcmData = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
          let s = Math.max(-1, Math.min(1, float32Data[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        // ArrayBuffer to Base64
        const bytes = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        this.onData(btoa(binary));
      };
  
      this.source.connect(this.processor);
      this.processor.connect(this.ac.destination);
    }
  
    public stop() {
      if (this.processor) {
          this.processor.disconnect();
          this.source.disconnect();
      }
      if (this.stream) {
          this.stream.getTracks().forEach(t => t.stop());
      }
      this.ac.close();
    }
}
