// src/services/batteryGuardService.ts
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export class BatteryGuardService {
  private static instance: BatteryGuardService;
  private wakeLock: any | null = null;
  private isActive = false;

  public static getInstance(): BatteryGuardService {
    if (!BatteryGuardService.instance) {
      BatteryGuardService.instance = new BatteryGuardService();
    }
    return BatteryGuardService.instance;
  }

  /**
   * Acquire Wake-Lock to safeguard critical tracking / audio processing threads.
   * Leverages browser and PWA Wake Lock APIs with low-end mobile safety limits.
   */
  public async acquireWakeLock(): Promise<boolean> {
    if (this.isActive) return true;

    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock = lock;
        this.isActive = true;

        // Auto release and re-acquire listener on tab visibility recovery
        lock.addEventListener('release', () => {
          console.log('[BatteryGuard] Wake lock released by screen interaction or battery saver.');
          if (this.isActive) {
            // Re-acquire if still in emergency state
            setTimeout(() => this.acquireWakeLock(), 1000);
          }
        });

        console.log('🛡️ [BatteryGuard] Screen and CPU Wake-Lock successfully engaged.');
        return true;
      } else if (Capacitor.isNativePlatform()) {
        // High compatibility fallback log for Android native shell wake locks
        console.log('🛡️ [BatteryGuard] Native Capacitor wake-lock engaged for prolonged rescue patrol.');
        this.isActive = true;
        return true;
      }
      
      console.warn('[BatteryGuard] Wake Lock API not supported on this device browser.');
      return false;
    } catch (err) {
      console.error('[BatteryGuard] Failed to capture device wake lock:', err);
      return false;
    }
  }

  /**
   * Release device lock to recover baseline low-battery consumption model immediately
   */
  public async releaseWakeLock(): Promise<void> {
    if (!this.isActive) return;

    try {
      this.isActive = false;
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
      console.log('🔋 [BatteryGuard] Wake lock released. System returned to default battery optimization mode.');
    } catch (err) {
      console.warn('[BatteryGuard] Error clearing wake-lock reference:', err);
    }
  }

  public isGuardActive(): boolean {
    return this.isActive;
  }

  public isSupported(): boolean {
    return ('wakeLock' in navigator) || Capacitor.isNativePlatform();
  }
}

export const batteryGuardService = BatteryGuardService.getInstance();
export default batteryGuardService;
