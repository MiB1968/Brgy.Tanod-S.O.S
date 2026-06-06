/**
 * src/server/routes/webhookRoutes.ts
 *
 * FIX BATCH — HIGH-02
 *
 * Change from original:
 *   The /telegram webhook endpoint had no authentication at all. Any actor
 *   on the internet could POST arbitrary JSON to it and trigger whatever
 *   telegramService.handleWebhook() does (send alerts, dispatch tanods, etc.).
 *
 *   Fix: Telegram validates webhooks by setting a secret token via
 *   setWebhook(url, { secret_token: "..." }). Telegram then sends this token
 *   in the X-Telegram-Bot-Api-Secret-Token header on every real webhook call.
 *   We verify this header server-side using a constant-time comparison to
 *   prevent timing attacks.
 *
 *   To enable: set TELEGRAM_WEBHOOK_SECRET in your environment to a random
 *   string (32+ chars), then re-register your webhook with Telegram:
 *     POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *     { url: "https://yourdomain.com/api/webhooks/telegram",
 *       secret_token: "<same value as TELEGRAM_WEBHOOK_SECRET>" }
 *
 *   If TELEGRAM_WEBHOOK_SECRET is not set the endpoint remains closed
 *   (returns 403) so an unconfigured deployment fails safe.
 *
 *   All other routes (FCM subscribe, sms-status) are unchanged.
 */

import { Request, Response, Router } from 'express';
import twilio from 'twilio';
import crypto from 'crypto';
import { telegramService } from '../services/telegramService';
import { getMessaging } from 'firebase-admin/messaging';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../config/index';

const router = Router();

// Allowed FCM topics depending on role
const ALLOWED_TOPICS = ['all_residents', 'tanod_alerts', 'emergency_broadcasts'];

router.post('/fcm/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).send('Missing token or topic');
    }

    if (!ALLOWED_TOPICS.includes(topic)) {
      return res.status(403).send('Invalid topic');
    }

    // Role restrictions for sensitive topics
    if (
      (topic === 'tanod_alerts' || topic === 'emergency_broadcasts') &&
      req.user?.role === 'resident'
    ) {
      return res.status(403).send('Unauthorized for sensitive topics');
    }

    await getMessaging().subscribeToTopic(token, topic);
    res.status(200).send('OK');
  } catch (err: any) {
    const errMsg = String(err);
    if (
      errMsg.includes('authenticate') ||
      errMsg.includes('401') ||
      errMsg.includes('credential') ||
      errMsg.includes('Messaging') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('disabled')
    ) {
      const cleanMsg = err.message
        ? err.message.split('<')[0].trim()
        : 'Authentication failure (likely unconfigured in sandbox)';
      console.warn(
        '[Webhook] FCM admin is offline, disabled, or unauthorized in sandbox environment:',
        cleanMsg
      );
      res.status(200).send('MOCK_OK');
    } else {
      const cleanMsg = err.message ? err.message.split('<')[0].trim() : String(err);
      console.error('[Webhook] FCM admin error:', cleanMsg);
      res.status(500).send('Error');
    }
  }
});

// ── HIGH-02 FIX: Telegram webhook secret validation ──────────────────────────
//
// Telegram sends the secret token you registered via setWebhook() in the
// X-Telegram-Bot-Api-Secret-Token header. We validate it with a constant-time
// comparison (crypto.timingSafeEqual) to prevent timing-based attacks.
//
// Constant-time comparison requires both buffers to be the same length.
// We pad/truncate both sides to 64 bytes to ensure this without leaking length.
//
function validateTelegramSecret(incomingHeader: string | undefined): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // If secret is not configured, fail closed — do not allow any requests.
  if (!secret) {
    console.error(
      '[Webhook/Telegram] TELEGRAM_WEBHOOK_SECRET is not set. ' +
        'Rejecting all telegram webhook calls. Set this env var and re-register ' +
        'your webhook with Telegram using the same value as secret_token.'
    );
    return false;
  }

  if (!incomingHeader) return false;

  // Constant-time comparison — prevents timing attacks.
  try {
    const expected = Buffer.alloc(64);
    const actual = Buffer.alloc(64);
    Buffer.from(secret).copy(expected);
    Buffer.from(incomingHeader).copy(actual);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

router.post('/telegram', (req: Request, res: Response) => {
  const incomingSecret = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;

  if (!validateTelegramSecret(incomingSecret)) {
    console.warn('[Webhook/Telegram] Rejected request with invalid or missing secret token.');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Secret validated — handle the update.
  Promise.resolve()
    .then(() => telegramService.handleWebhook(req.body))
    .then(() => res.status(200).send('OK'))
    .catch((err) => {
      console.error('[Webhook] Telegram error:', err);
      res.status(500).send('Error');
    });
});

// ── Twilio SMS status callback ────────────────────────────────────────────────
// validate: true in production — Twilio signs its requests with your Auth Token.
const twilioWebhook = twilio.webhook({
  validate: config.nodeEnv === 'production',
  protocol: 'https',
});

router.post('/sms-status', twilioWebhook, async (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body;
  console.log(`[SMS Status] ${MessageSid} → ${MessageStatus} to ${To}`);
  res.sendStatus(200);
});

export default router;
