import { Capacitor } from '@capacitor/core';

export interface PermissionResult {
  fineLocation: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
  ignoresBatteryOptimization: boolean;
}

export async function requestAllTrackingPermissions(): Promise<PermissionResult> {
  const result: PermissionResult = {
    fineLocation: false,
    backgroundLocation: false,
    notifications: false,
    ignoresBatteryOptimization: false,
  };

  if (!Capacitor.isNativePlatform()) {
    return result;
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');

    let status = await Geolocation.checkPermissions();
    if (status.location !== 'granted') {
      status = await Geolocation.requestPermissions({ permissions: ['location'] });
    }
    result.fineLocation = status.location === 'granted';

    if (result.fineLocation && status.coarseLocation !== 'denied') {
      const bg = await Geolocation.requestPermissions({ permissions: ['location'] });
      result.backgroundLocation = !!bg.location && bg.location === 'granted';
    }
  } catch (e) {
    console.warn('[permissions] geolocation request failed', e);
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let n = await LocalNotifications.checkPermissions();
    if (n.display !== 'granted') {
      n = await LocalNotifications.requestPermissions();
    }
    result.notifications = n.display === 'granted';
  } catch (e) {
    console.warn('[permissions] notifications request failed', e);
  }
  return result;
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
    await BackgroundGeolocation.openSettings();
  } catch (e) {
    console.warn('[permissions] could not open battery settings', e);
  }
}
