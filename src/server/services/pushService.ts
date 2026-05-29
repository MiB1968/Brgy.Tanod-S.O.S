import admin from 'firebase-admin';

// Initialize Firebase Admin 
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

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
      console.log("DEBUG: sendSOSPushToNearbyTanods called with alert:", JSON.stringify(alert));
      
      if (!alert) {
        console.log("⚠️ No alert data");
        return;
      }

      // Safe Firestore query
      const db = admin.firestore();
      console.log("DEBUG: admin.firestore initialized");
      
      const snapshot = await db
        .collection('users')
        .where('role', 'in', ['tanod', 'admin'])
        .get();

      console.log("DEBUG: Firestore snapshot retrieved");

      // Defensive token collection
      const tokens: string[] = [];

      if (snapshot && snapshot.forEach) {
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Support both pushToken and fcmToken for backward compatibility
          const token = data?.fcmToken || data?.pushToken;
          if (token && typeof token === 'string' && token.length > 10) {
            tokens.push(token);
          }
        });
      }
      
      console.log("DEBUG: tokens collected:", tokens.length);

      if (tokens.length === 0) {
        console.log("ℹ️ No valid push tokens found");
        return;
      }

      const message = {
        notification: {
          title: `🚨 SOS - ${alert.type || 'Emergency'}`,
          body: `Help needed`,
        },
        data: { alertId: String(alert.id || '') },
        tokens: tokens
      };

      console.log("DEBUG: message prepared, sending...");
      
      const response = await admin.messaging().sendEachForMulticast({
        ...message,
        tokens: tokens
      });
      console.log(`✅ Push sent to ${response.successCount}/${tokens.length} devices`);

    } catch (error: any) {
      const errMsg = String(error);
      if (
        errMsg.includes('authenticate') ||
        errMsg.includes('401') ||
        errMsg.includes('credential') ||
        errMsg.includes('Messaging') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('Firestore API') ||
        errMsg.includes('disabled')
      ) {
        console.warn("⚠️ Push Service Firestore/FCM is offline, disabled, or unconfigured in sandbox environment (allowing graceful fallback).");
      } else {
        console.error("❌ Push Service Error:", error.message, error.stack);
      }
    }
  }
}

export const serverPushService = ServerPushService.getInstance();
