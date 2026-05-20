import twilio from 'twilio';
import { Alert } from '../../types';
import { config } from '../config/index';
import { getDb, admin } from '../db/index';

// Initialize lazily to avoid crashing on boot if env vars are missing
let twilioClient: twilio.Twilio | null = null;

export interface SmsResult {
  to: string;
  sid?: string;
  status: 'queued' | 'sent' | 'failed' | 'delivered';
  error?: string;
}

export class SmsService {
  private static instance: SmsService;

  static getInstance() {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  private getClient() {
    if (!twilioClient && config.twilio.accountSid && config.twilio.authToken) {
      try {
        twilioClient = twilio(
          config.twilio.accountSid,
          config.twilio.authToken
        );
      } catch (err) {
        console.error('[SMS] Failed to initialize Twilio client:', err);
      }
    }
    return twilioClient;
  }

  async sendSOSFallback(alert: Alert, recipients: string[]): Promise<SmsResult[]> {
    if (!config.twilio.enabled || !recipients?.length) {
      return [];
    }

    const client = this.getClient();
    if (!client) {
      console.warn('[SMS] Twilio client not initialized (missing credentials). Skipping SMS fallback.');
      return [];
    }

    const mapLink = `https://www.google.com/maps?q=${alert.location?.lat},${alert.location?.lng}`;
    
    const messageBody = `🚨 BRGY TANOD SOS ALERT!\n\n` +
      `Type: ${alert.type || 'Emergency'}\n` +
      `Reporter: ${alert.residentName || 'Resident'}\n` +
      `Location: ${alert.location?.lat?.toFixed(6) || 0}, ${alert.location?.lng?.toFixed(6) || 0}\n` +
      `Time: ${new Date(alert.timestamp).toLocaleString('en-PH')}\n` +
      `Map: ${mapLink}\n\n` +
      `Reply "RESP ${alert.id?.slice(0, 8) || ''}" to acknowledge.`;

    const results: SmsResult[] = [];
    const sanitizedRecipients = recipients
      .slice(0, config.twilio.maxRecipients)
      .map(phone => phone.startsWith('+') ? phone : `+63${phone.replace(/^0+/, '')}`);

    for (const to of sanitizedRecipients) {
      try {
        const msg = await client.messages.create({
          body: messageBody,
          from: config.twilio.messagingServiceSid || config.twilio.phoneNumber,
          to,
          statusCallback: config.twilio.statusCallbackUrl,
        });

        results.push({ to, sid: msg.sid, status: 'queued' });

        await this.logSms(alert.id, to, msg.sid!, messageBody);
      } catch (error: any) {
        console.error(`[SMS] Failed to send to ${to}:`, error.message);
        results.push({ to, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  private async logSms(alertId: string, to: string, sid: string, body: string) {
    try {
      const dbInstance = getDb();
      if (dbInstance) {
        await dbInstance.collection('smsLogs').add({
          alertId,
          to,
          sid,
          body: body.substring(0, 500),
          timestamp: admin?.firestore?.FieldValue?.serverTimestamp() ?? new Date(),
          status: 'queued'
        });
        console.log(`[SMS Log] Created Firestore log for alert ${alertId} to ${to}`);
      }
    } catch (e) {
      console.warn('Failed to log SMS to Firestore smsLogs:', e);
    }
  }

  // Support both sendCustom and sendCustomMessage
  async sendCustom(to: string, body: string) {
    const client = this.getClient();
    if (!client) return { status: 'failed', error: 'Twilio not initialized' };
    
    const formattedTo = to.startsWith('+') ? to : `+63${to.replace(/^0+/, '')}`;
    try {
      const msg = await client.messages.create({
        body,
        from: config.twilio.messagingServiceSid || config.twilio.phoneNumber,
        to: formattedTo,
        statusCallback: config.twilio.statusCallbackUrl,
      });
      return { to: formattedTo, sid: msg.sid, status: 'queued' };
    } catch(err: any) {
      return { to: formattedTo, status: 'failed', error: err.message };
    }
  }

  async sendCustomMessage(to: string, body: string) {
    return this.sendCustom(to, body);
  }
}

export const smsService = SmsService.getInstance();
