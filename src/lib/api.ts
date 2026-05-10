/**
 * Native CockroachDB API Client
 * Replaces Firebase SDK with standard HTTP/WebSocket patterns
 */

const API_BASE = '/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "x-api-key": import.meta.env.VITE_API_SECRET_KEY || "dev-secret-123",
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API Request failed');
  }

  return response.json();
}

export const auth = {
  login: (credentials: any) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (data: any) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getProfile: (id: string) => fetchAPI(`/users/${id}`),
  updateProfile: (id: string, data: any) => fetchAPI(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

export const alerts = {
  create: (data: any) => fetchAPI('/sos/alert', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getActive: () => fetchAPI('/sos/active'),
  getAll: () => fetchAPI('/sync?path=alerts'),
  update: (id: string, data: any) => fetchAPI(`/sync`, {
    method: 'POST',
    body: JSON.stringify({ path: `alerts/${id}`, data, options: { merge: true } }),
  }),
};

export const system = {
  getBroadcast: () => fetchAPI('/sync?path=system_broadcasts'),
  updateSiren: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'system/siren', data }),
  }),
};

export const residents = {
  getAll: () => fetchAPI('/sync?path=residents'),
  update: (id: string, data: any) => fetchAPI(`/sync`, {
    method: 'POST',
    body: JSON.stringify({ path: `residents/${id}`, data }),
  }),
  updateRole: (id: string, role: string) => fetchAPI(`/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }),
};

export const incidents = {
  create: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'incidents', data }),
  }),
  getAll: () => fetchAPI('/sync?path=incidents'),
};

export const logs = {
  create: (data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: 'tanod_activity_logs', data }),
  }),
  getAll: () => fetchAPI('/sync?path=tanod_activity_logs'),
};

export const chat = {
  getMessages: (alertId: string) => fetchAPI(`/sync?path=alerts/${alertId}/messages`),
  sendMessage: (alertId: string, data: any) => fetchAPI('/sync', {
    method: 'POST',
    body: JSON.stringify({ path: `alerts/${alertId}/messages`, data }),
  }),
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
