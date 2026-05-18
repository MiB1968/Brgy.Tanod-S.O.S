import { fetchAPI } from './apiBase';

export const chatService = {
  getMessages: (alertId: string) => fetchAPI(`/sync?path=alerts/${alertId}/messages`),
  sendMessage: (alertId: string, data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: `alerts/${alertId}/messages`, data }),
  }),
};
