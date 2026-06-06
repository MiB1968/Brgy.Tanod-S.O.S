/**
 * src/server/services/pushService.ts
 *
 * FIX — HIGH-PUSH-DOUBLE-INIT
 *
 * Bug: This file independently called admin.initializeApp() at module load time:
 *
 *   if (!admin.apps.length) {
 *     admin.initializeApp({ credential: admin.credential.applicationDefault() });
 *   }
 *
 * This created a RACE CONDITION and config mismatch with db/index.ts which
 * also calls admin.initializeApp({ projectId: config.firebase.projectId }).
 *
 * Problem 1 — If pushService.ts is imported BEFORE db/index.ts runs initDatabase():
 *   pushService initializes Firebase with applicationDefault() credentials.
 *   When db/index.ts later calls admin.initializeApp(), admin.apps.length > 0
 *   so it skips initialization — but now the app is using the push service's
 *   credential (applicationDefault) instead of the project-based config.
 *   In Cloud Run without a service account key file, applicationDefault()
 *   may succeed but have DIFFERENT permissions than project-id-only init.
 *
 * Problem 2 — If db/index.ts runs FIRST (the normal case):
 *   admin.apps.length > 0 so pushService's guard skips — correct.
 *   But the fallback `admin.initializeApp({ projectId: ... })` block was
 *   inside a try/catch that silently discarded errors on the FIRST init
 *   path, making it hard to diagnose misconfiguration.
 *
 * Fix: Remove the independent initialization entirely. Simply import `admin`
 * from db/index.ts which is the single source of truth for Firebase Admin.
 * pushService.ts becomes a pure consumer.
 *
 * This is a DROP-IN REPLACEMENT for src/server/services/pushService.ts.
 */

import { admin } from '../db/index';

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
      if (!alert) {
        console.log('[PushService] No alert data provided — skipping push.');
        return;
      }

      const db = admin.firestore();

      const snapshot = await db
        .collection('users')
        .where('role', 'in', ['tanod', 'admin'])
        .get();

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

      if (tokens.length === 0) {
        console.log('[PushService] No valid push tokens found — skipping multicast.');
        return;
      }

      const response = await admin.messaging().sendEachForMulticast({
        notification: {
          title: `🚨 SOS - ${alert.type || 'Emergency'}`,
          body: `Help needed at ${alert.location?.address || 'unknown location'}`,
        },
        data: { alertId: String(alert.id || '') },
        tokens,
      });

      console.log(
        `[PushService] Push sent to ${response.successCount}/${tokens.length} devices`
      );

      // Log failures for debugging (but don't throw)
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(
            `[PushService] Token[${idx}] failed: ${resp.error?.message}`
          );
        }
      });
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
        console.warn(
          '[PushService] FCM/Firestore offline or unconfigured (graceful fallback).'
        );
      } else {
        console.error('[PushService] Push error:', error.message, error.stack);
      }
    }
  }
}

export const serverPushService = ServerPushService.getInstance();
