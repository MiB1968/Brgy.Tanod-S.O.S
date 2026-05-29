// src/services/smsFallback.ts

import { compressSOS } from './smsCompression';
import type { SOSPayload } from './smsCompression';
import { toast } from 'react-hot-toast';

export class SmsFallbackService {
  private static instance: SmsFallbackService | null = null;

  public static getInstance(): SmsFallbackService {
    if (!SmsFallbackService.instance) {
      SmsFallbackService.instance = new SmsFallbackService();
    }
    return SmsFallbackService.instance;
  }

  /**
   * Broadcasts compacted SOS payload to Tanod officer phone numbers.
   * If online, uses Twilio service proxy backend.
   * If offline, constructs cellular native 'sms:' protocol URLs with compressed text payload.
   */
  public async sendEmergencySMS(payload: SOSPayload, targetNumbers: string[]): Promise<boolean> {
    const compressedMessage = compressSOS(payload);
    
    // Check if network is available
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        let successCount = 0;
        for (const number of targetNumbers) {
          const cleanNodeNumber = number.replace(/\s+/g, '');
          const response = await fetch('/api/sms/emergency', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: cleanNodeNumber,
              message: compressedMessage
            })
          });

          if (response.ok) {
            successCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Broadcasting SOS fallbacks via centralized cellular relay (${successCount} successful)`);
          return true;
        }
      } catch (err) {
        console.warn('Centralized SMS broadcast failed. Switching to local cellular override...', err);
      }
    }

    // Completely offline fallback: trigger local phone SMS intent
    try {
      const numbersString = targetNumbers.join(',');
      // Generate standard mobile cellular URI
      // Android uses ?body=, iOS uses &body= typically. We default to ?body=
      const smsUri = `sms:${numbersString}?body=${encodeURIComponent(compressedMessage)}`;
      
      // Dispatch custom event to notify UI to launch native intent or display dialog
      window.dispatchEvent(new CustomEvent('sms-fallback-trigger', {
        detail: {
          payload,
          uri: smsUri,
          message: compressedMessage,
          numbers: targetNumbers
        }
      }));

      toast('Offline: Click or activate SMS fallback link to broadcast', {
        icon: '📡',
        duration: 5000,
        style: { background: '#1e1b4b', color: '#a5f3fc', border: '1px solid #06b6d4' }
      });

      return true;
    } catch (e) {
      console.error('Failed to trigger native SMS intent fallback:', e);
      return false;
    }
  }

  /**
   * Automatic entrypoint on communication failure or severe alerts
   */
  public async triggerFallback(payload: SOSPayload) {
    // Default fallback contacts (e.g. Barangay command center, Tanod leader)
    // In practice, this could be loaded dynamically from useAppStore or local db
    const fallbackNumbers = ['09171234567'];
    
    await this.sendEmergencySMS(payload, fallbackNumbers);
  }
}

export const smsFallback = SmsFallbackService.getInstance();
