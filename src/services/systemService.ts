import { fetchAPI } from './apiBase';

export const systemService = {
  getBroadcast: () => fetchAPI('/sync?path=system_broadcasts'),
  updateSiren: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'system/siren', data }),
  }),
  listQwenPawAgents: () => fetchAPI('/system/qwenpaw/agents'),
  saveQwenPawConfig: (data: { dispatcherAgentId: string }) => fetchAPI('/system/qwenpaw/config', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getQwenPawConfig: () => fetchAPI('/system/qwenpaw/config'),
};
