/**
 * Native CockroachDB API Client
 * Replaces Firebase SDK with standard HTTP/WebSocket patterns
 */

const API_BASE = '/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`API request to ${endpoint} failed with status ${response.status}: ${response.statusText}`);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        const message = error.error?.message || error.error || error.message || 'API Request failed';
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
      }
    }

    const contentType = response.headers.get('content-type');
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Try to parse as JSON if it looks like JSON or check the header
    if ((contentType && contentType.includes('application/json')) || !contentType) {
      try {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error(`Failed to parse response as JSON: ${response.statusText}`);
      }
    } else {
      throw new Error(`Expected JSON response, but got content-type: ${contentType}`);
    }
  } catch (err: any) {
    console.error(`API request to ${endpoint} failed:`, err);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  }
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
  cancel: (id: string) => fetchAPI(`/sos/alert/${id}/cancel`, {
    method: 'POST'
  }),
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
  updateRole: (id: string, role: string) => fetchAPI(`/users/${id}`, {
    method: 'PATCH',
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
