import admin from 'firebase-admin';
import { db } from '../db'; 

// Initialize Firebase Admin 
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const firestore = admin.firestore();

export class ServerPushService {
  private static instance: ServerPushService;

  static getInstance() {
    if (!ServerPushService.instance) {
      ServerPushService.instance = new ServerPushService();
    }
    return ServerPushService.instance;
  }

  async sendSOSPushToNearbyTanods(alert: any) {
    try {
      const nearbyTanods = await this.getNearbyTanodsWithTokens(alert.location, 5000); 

      if (nearbyTanods.length === 0) return;

      const message = {
        notification: {
          title: `🚨 SOS ALERT - ${alert.type}`,
          body: `${alert.residentName || 'A resident'} needs help at ${alert.location.lat.toFixed(5)}, ${alert.location.lng.toFixed(5)}`,
        },
        data: {
          alertId: alert.id,
          type: alert.type || 'unknown',
          lat: alert.location.lat.toString(),
          lng: alert.location.lng.toString(),
          timestamp: Date.now().toString()
        },
        webpush: {
            fcmOptions: {
                link: '/'
            },
            notification: {
                icon: '/icon-192.png',
                badge: '/badge.png',
                vibrate: [200, 100, 200, 100, 200]
            }
        }
      };

      const tokens = nearbyTanods.map(t => t.pushToken).filter(Boolean);

      if (tokens.length > 0) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          ...message
        });

        console.log(`✅ SOS Push sent to ${response.successCount}/${tokens.length} Tanods`);
      }
    } catch (error) {
      console.error('❌ Failed to send push notifications:', error);
    }
  }

  private async getNearbyTanodsWithTokens(center: { lat: number; lng: number }, radiusMeters: number) {
    const snapshot = await firestore.collection('users')
      .where('role', 'in', ['tanod', 'admin'])
      .get();

    const tanods: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.pushToken || !data.location) return;

      const distance = this.calculateDistance(
        center.lat, center.lng,
        data.location.lat, data.location.lng
      );

      if (distance <= radiusMeters) {
        tanods.push({
          id: doc.id,
          pushToken: data.pushToken
        });
      }
    });

    return tanods;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export const serverPushService = ServerPushService.getInstance();
