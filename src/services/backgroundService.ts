import { Capacitor } from '@capacitor/core';
import { BackgroundRunner } from '@capacitor/background-runner';

export async function initBackgroundRunner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('🌐 Web environment: Skipping Capacitor BackgroundRunner initialization.');
    return;
  }

  try {
    // Check background permissions safely
    const permissions: any = await BackgroundRunner.checkPermissions();
    if (permissions?.backgroundRunner !== 'granted') {
      await BackgroundRunner.requestPermissions({ permissions: ['location'] } as any);
    }

    // Dispatch custom background event (DispatchEventOptions expects both label and event under TypeScript definitions)
    await BackgroundRunner.dispatchEvent({
      label: 'sosWatcher',
      event: 'sosWatcher',
      details: {}
    });
    
    console.log('✅ Background runner event dispatched successfully');
  } catch (error) {
    console.warn('⚠️ BackgroundRunner initialization or dispatch failed:', error);
  }
}
