import { Router } from 'express';
import { telegramService } from '../services/telegramService';
import { getMessaging } from 'firebase-admin/messaging';

const router = Router();

router.post('/fcm/subscribe', async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (token && topic) {
      await getMessaging().subscribeToTopic(token, topic);
      res.status(200).send('OK');
    } else {
      res.status(400).send('Missing token or topic');
    }
  } catch (err) {
    console.error('[Webhook] FCM admin error:', err);
    res.status(500).send('Error');
  }
});

router.post('/telegram', async (req, res) => {
  try {
    await telegramService.handleWebhook(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Telegram error:', err);
    res.status(500).send('Error');
  }
});

export default router;
