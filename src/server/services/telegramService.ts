import axios from 'axios';
import { voiceAssistantService } from './voiceAssistantService';
import { VoicePermissionLevel } from './voiceAssistantService.types';

export class TelegramService {
  private readonly token: string | null;
  private readonly apiUrl: string;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || null;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
  }

  async handleWebhook(data: any) {
    if (!this.token) return;
    
    const message = data.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text;
    const userId = `tg_${message.from.id}`;

    // Simple mapping: for now, assume anyone coming from Telegram is a responder 
    // In a real app, you'd verify their phone number/ID against the DB
    const role = VoicePermissionLevel.TANOD; 

    console.log(`[Telegram] Message from ${userId}: ${text}`);

    try {
      const response = await voiceAssistantService.processVoiceInput(userId, {
        transcript: text,
        language: 'fil',
      }, role);

      await this.sendMessage(chatId, response.reply);
    } catch (err) {
      console.error('[Telegram] Error processing message:', err);
      await this.sendMessage(chatId, "Paumanhin, nagkaroon ng error sa pag-proseso ng iyong request.");
    }
  }

  async sendMessage(chatId: string | number, text: string) {
    if (!this.token) return;
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
      });
    } catch (err) {
      console.error('[Telegram] Error sending message:', err);
    }
  }

  async setWebhook(url: string) {
    if (!this.token) return;
    try {
      await axios.post(`${this.apiUrl}/setWebhook`, { url: `${url}/api/webhooks/telegram` });
      console.log(`[Telegram] Webhook set to ${url}/api/webhooks/telegram`);
    } catch (err) {
      console.error('[Telegram] Error setting webhook:', err);
    }
  }
}

export const telegramService = new TelegramService();
