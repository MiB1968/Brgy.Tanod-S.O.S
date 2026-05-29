import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { messaging, firebaseApp } from '../lib/firebase';
import { getMessaging } from 'firebase/messaging';
import { useSystemStore } from '../store/useSystemStore';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;
  private messagingInstance: any = null;

  static getInstance() {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<string | null> {
    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn("❌ Messaging not supported in this browser");
        return null;
      }

      // Ensure we have a messaging instance
      if (!this.messagingInstance) {
        try {
          this.messagingInstance = getMessaging(firebaseApp);
        } catch (e) {
          console.error("Failed to get messaging instance:", e);
          return null;
        }
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messagingInstance, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (token) {
          this.token = token;
          console.log("✅ FCM Token registered");
          return token;
        }
      }
    } catch (error) {
      console.error("❌ Push Service Initialization Failed:", error);
    }
    return null;
  }

  listenForMessages() {
    if (!this.messagingInstance) return;
    onMessage(this.messagingInstance, (payload) => {
      console.log('New SOS Push Received:', payload);
      alert(`🚨 SOS ALERT: ${payload.notification?.title}\n${payload.notification?.body}`);
    });
  }
}

export const pushService = PushNotificationService.getInstance();
