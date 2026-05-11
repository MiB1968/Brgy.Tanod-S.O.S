/**
 * Native CockroachDB API Client
 * Replaces Firebase SDK with standard HTTP/WebSocket patterns
 */

import { safeStorage } from './safeStorage';

const API_BASE = '/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}, retries = 2) {
  const token = safeStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const timeout = endpoint.includes('analytics') || endpoint.includes('sync') ? 60000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // send cookies for cross-origin authentication
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // If it's a 5xx error or rate limit, we might want to retry
      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        console.warn(`API ${endpoint} failed with ${response.status}. Retrying... (${retries} left)`);
        await new Promise(res => setTimeout(res, 1000 * (3 - retries))); // Exponential-ish backoff
        return fetchAPI(endpoint, options, retries - 1);
      }

      const status = response.status;
      const statusText = response.statusText;
      console.error(`API request to ${endpoint} failed with status ${status}: ${statusText}`);
      
      let errorMessage = `Server error (${status}): ${statusText}`;
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Fallback to status text
        }
      }
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    const contentType = response.headers.get('content-type');
    
    if (response.status === 204) {
      return null;
    }

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
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      if (retries > 0) {
        console.warn(`API ${endpoint} timed out. Retrying... (${retries} left)`);
        return fetchAPI(endpoint, options, retries - 1);
      }
      throw new Error('Request timed out. Please check your connection.');
    }

    // Network errors (Failed to fetch)
    if (err.message === 'Failed to fetch' && retries > 0) {
      console.warn(`API ${endpoint} network error. Retrying... (${retries} left)`);
      await new Promise(res => setTimeout(res, 2000));
      return fetchAPI(endpoint, options, retries - 1);
    }

    console.error(`API request to ${endpoint} failed:`, err);
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
