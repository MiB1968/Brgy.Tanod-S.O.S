import twilio from 'twilio';
import { Alert } from '../../types';
import { config } from '../config/index';

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
      twilioClient = twilio(
        config.twilio.accountSid,
        config.twilio.authToken
      );
    }
    return twilioClient;
  }

  async sendSOSFallback(alert: Alert, recipients: string[]): Promise<SmsResult[]> {
    if (!config.twilio.enabled || recipients.length === 0) {
      return [];
    }

    const client = this.getClient();
    if (!client) {
      console.warn('[SMS] Twilio client not initialized (missing credentials). Skipping SMS fallback.');
      return [];
    }

    const mapLink = `https://maps.google.com/?q=${alert.location?.lat},${alert.location?.lng}`;
    
    const messageBody = `🚨 BRGY TANOD SOS!\n` +
      `Type: ${alert.type}\n` +
      `Reporter: ${alert.residentName || 'Unknown Resident'}\n` +
      `Location: ${alert.location?.lat?.toFixed(6) || 0}, ${alert.location?.lng?.toFixed(6) || 0}\n` +
      `Time: ${new Date(alert.timestamp).toLocaleString('en-PH')}\n` +
      `View Map: ${mapLink}\n\n` +
      `Reply "RESP ${alert.id.slice(0,8)}" to acknowledge.`;

    const results: SmsResult[] = [];

    for (const rawTo of recipients.slice(0, config.twilio.maxRecipients)) {
      const to = rawTo.startsWith('+') ? rawTo : `+63${rawTo.replace(/^0/, '')}`;

      try {
        const msg = await client.messages.create({
          body: messageBody,
          from: config.twilio.messagingServiceSid || config.twilio.phoneNumber,
          to,
          statusCallback: config.twilio.statusCallbackUrl,
        });

        results.push({
          to,
          sid: msg.sid,
          status: 'queued'
        });

        await this.logSmsSend(alert.id, to, msg.sid, messageBody);
      } catch (error: any) {
        console.error(`[SMS] Failed to send to ${to}`, error);
        results.push({ to, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  private async logSmsSend(alertId: string, to: string, sid: string, body: string) {
    // In a real implementation this would log to DB.
    console.log(`[SMS Log] Alert ${alertId} → ${to} | SID: ${sid}`);
  }

  async sendCustom(to: string, body: string) {
    const client = this.getClient();
    if (!client) return { status: 'failed', error: 'Twilio not initialized' };
    
    const formattedTo = to.startsWith('+') ? to : `+63${to.replace(/^0/, '')}`;
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
}

export const smsService = SmsService.getInstance();
