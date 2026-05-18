import { fetchAPI } from './apiBase';

export const aiService = {
  analyze: (description: string, initialType?: string) => fetchAPI('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ description, initialType }),
  }),
  getGuardianResponse: (text: string) => fetchAPI('/ai/guardian', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
};
