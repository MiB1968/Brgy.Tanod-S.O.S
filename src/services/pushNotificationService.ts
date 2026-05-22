import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { useSystemStore } from '../store/useSystemStore';

export class PushNotificationService {
  private static instance: PushNotificationService;

  static getInstance() {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize() {
    try {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      if (token) {
        console.log('✅ Push Token:', token);
      }
    } catch (err) {
      console.error('Push permission denied', err);
    }
  }

  listenForMessages() {
    onMessage(messaging, (payload) => {
      console.log('New SOS Push Received:', payload);
      alert(`🚨 SOS ALERT: ${payload.notification?.title}\n${payload.notification?.body}`);
    });
  }
}

export const pushService = PushNotificationService.getInstance();
