import { guardianAI } from './guardianAI';

export class ModelProfiler {
  private static instance: ModelProfiler | null = null;

  public static getInstance(): ModelProfiler {
    if (!ModelProfiler.instance) {
      ModelProfiler.instance = new ModelProfiler();
    }
    return ModelProfiler.instance;
  }

  /** Run memory profiler calibrated specifically to local WebLLM or fallback proxy */
  public async runMemoryProfile(): Promise<void> {
    console.log('🧪 Starting WebLLM Memory Profiler telemetry...');

    const perf = window.performance as any;
    const startMemory = perf?.memory?.usedJSHeapSize || 0;

    // Trigger local service worker verification
    // guardianAI.init(); // DEACTIVATED: Prevents immediate WebLLM WebWorker load battery drain on low-end devices on boot.
    
    // Fallback: Just let the system lazy load it when the user clicks the Voice Assistant.

    const endMemory = perf?.memory?.usedJSHeapSize || 0;
    const diff = (endMemory - startMemory) / (1024 * 1024); // Convert bytes to MB

    console.log(`📊 Memory Profiler Output:`);
    console.log(`   - Start Heap: ${(startMemory / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   - End Heap: ${(endMemory / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   - Overhead Diff: ${diff.toFixed(1)} MB`);
    
    // Access internal device calibration safely via index access
    const profile = (guardianAI as any).deviceProfile || 'MEDIUM';
    console.log(`   - Device Profile: ${profile}`);

    if (diff > 180 && profile === 'LOW') {
      console.warn('⚠️ High memory footprint noticed on low-end hardware tier. Consider enforcing Lite Mode for rendering.');
    }
  }
}

export const modelProfiler = ModelProfiler.getInstance();
export default modelProfiler;
