import { getMessaging } from "firebase-admin/messaging";
import { logger } from "../utils/logger";

export class NotificationService {
  /**
   * Send an urgent push notification to a specific Tanod device.
   */
  async sendToDevice(token: string, title: string, body: string, data?: Record<string, string>) {
    if (!token) return;

    try {
      const response = await getMessaging().send({
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token,
        android: {
          priority: "high",
          notification: {
            sound: "emergency_alert",
            channelId: "high_priority_notifications",
            clickAction: "FLUTTER_NOTIFICATION_CLICK"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "emergency.wav",
              contentAvailable: true,
            }
          }
        }
      });
      console.log(`[Notification] Successfully sent push to device: ${response}`);
      return response;
    } catch (error: any) {
      logger.error("FCM Send Error", { token, error: error.message });
      throw error;
    }
  }

  /**
   * Broadcast an alert to all Tanod responders subscribed to a topic.
   */
  async broadcastToResponders(title: string, body: string, data?: Record<string, string>) {
    try {
      const response = await getMessaging().send({
        notification: {
          title,
          body,
        },
        data: data || {},
        topic: "responders",
      });
      console.log(`[Notification] Broadcast sent to topic 'responders': ${response}`);
      return response;
    } catch (error: any) {
      logger.error("FCM Broadcast Error", { error: error.message });
      throw error;
    }
  }

  /**
   * Alert a specific roster of Tanods about an incident.
   */
  async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (!tokens || tokens.length === 0) return;

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data || {},
      });
      console.log(`[Notification] Multicast result: ${response.successCount} success, ${response.failureCount} failed`);
      return response;
    } catch (error: any) {
      logger.error("FCM Multicast Error", { error: error.message });
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
