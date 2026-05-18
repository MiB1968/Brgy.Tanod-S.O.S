import { fetchAPI } from './apiBase';

export const incidentService = {
  create: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'incidents', data }),
  }),
  getAll: () => fetchAPI('/sync?path=incidents'),
};

export const logService = {
  create: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'tanod_activity_logs', data }),
  }),
  getAll: () => fetchAPI('/sync?path=tanod_activity_logs'),
};
