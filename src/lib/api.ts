/**
 * Native CockroachDB API Client
 * Replaces Firebase SDK with standard HTTP/WebSocket patterns
 */

import { authService as auth } from '../services/authService';
import { emergencyService as alerts } from '../services/emergencyService';
import { systemService as system } from '../services/systemService';
import { incidentService as incidents, logService as logs } from '../services/incidentService';
import { chatService as chat } from '../services/chatService';
import { fetchAPI } from '../services/apiBase';

export { auth, alerts, system, incidents, logs, chat, fetchAPI };

export const residents = {
  getAll: () => fetchAPI('/sync?path=residents'),
  update: (id: string, data: any) => fetchAPI(`/sync`, {
    method: 'POST',
    body: JSON.stringify({ path: `residents/${id}`, data }),
  }),
  updateRole: (id: string, role: string) => fetchAPI(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }),
};

export const intelligence = {
  getDashboard: () => fetchAPI('/intelligence/dashboard'),
  getBriefing: (stats: any) => fetchAPI('/intelligence/briefing', {
    method: 'POST',
    body: JSON.stringify({ stats })
  }),
  getHeatmap: () => fetchAPI('/intelligence/heatmap'),
};

export const generic = {
  get: (path: string) => fetchAPI(`/sync?path=${path}`),
  update: (path: string, data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path, data, options: { merge: true } }),
  }),
  create: (path: string, data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path, data }),
  }),
  delete: (path: string) => fetchAPI(`/sync`, {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  }),
  list: (path: string) => fetchAPI(`/sync?path=${encodeURIComponent(path)}`),
};

export const admin = {
  createUser: (data: any) => fetchAPI('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
