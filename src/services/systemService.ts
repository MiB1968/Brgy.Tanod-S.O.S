import { fetchAPI } from './apiBase';

export const systemService = {
  getBroadcast: () => fetchAPI('/sync?path=system_broadcasts'),
  updateSiren: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'system/siren', data }),
  }),
};
