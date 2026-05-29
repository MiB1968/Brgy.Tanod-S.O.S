import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

export class NativeService {
  private static instance: NativeService | null = null;

  public static getInstance(): NativeService {
    if (!NativeService.instance) {
      NativeService.instance = new NativeService();
    }
    return NativeService.instance;
  }

  /** Check if the app is running on a native platform */
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** Request all critical permissions safely */
  public async requestPermissions(): Promise<void> {
    if (!this.isNative()) {
      console.log('🌐 Web environment: Skipping native permission requests.');
      return;
    }

    try {
      // Geolocations permissions
      const geoPerm = await Geolocation.checkPermissions();
      if (geoPerm.location !== 'granted') {
        await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      }

      // Notification permissions
      const notifPerm = await LocalNotifications.checkPermissions();
      if (notifPerm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      console.log('✅ Native permissions checked/granted successfully');
    } catch (error) {
      console.warn('⚠️ Native permission request failed:', error);
    }
  }

  /** Get accurate current position (with offline and web fallback) */
  public async getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    try {
      if (this.isNative()) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } else {
        // Standard Web Geolocation fallback
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported by this browser'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch (error) {
      console.warn('⚠️ Geolocation retrieval failed. Falling back to default Manila/Barangay coordinates:', error);
      // Fallback to default Manila/Barangay coordinates (grounded Philippine context)
      return { lat: 14.5995, lng: 120.9842 };
    }
  }

  /** Send local notification (works natively and logs gracefully in web) */
  public async sendNotification(title: string, body: string): Promise<void> {
    if (!this.isNative()) {
      console.log(`🔔 Web Notification simulation - Title: "${title}", Body: "${body}"`);
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() / 1000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'emergency'
          }
        ]
      });
    } catch (error) {
      console.warn('⚠️ Native local notification failed to schedule:', error);
    }
  }
}

export const nativeService = NativeService.getInstance();
export default nativeService;
