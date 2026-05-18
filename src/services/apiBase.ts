/**
 * Base API Client for Brgy. Tanod S.O.S.
 * Handles authentication, timeouts, and error handling for all service calls.
 */

import * as safeStorage from '../lib/safeStorage';

const API_BASE = '/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> {
  const token = safeStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && token !== 'cookie-auth' ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const timeout = endpoint.includes('analytics') || endpoint.includes('sync') ? 60000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE}/${cleanEndpoint}`;
    
    if (endpoint.includes('/undefined')) {
      throw new Error(`Invalid API endpoint (contains undefined): ${endpoint}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        await new Promise(res => setTimeout(res, 1000 * (3 - retries)));
        return fetchAPI(endpoint, options, retries - 1);
      }

      if (response.status === 401) {
        window.dispatchEvent(new Event('auth-expired'));
      }
      
      let errorMessage = `Server error (${response.status}): ${response.statusText}`;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorMessage;
        } catch (e) {}
      }
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type');
    if ((contentType && contentType.includes('application/json')) || !contentType) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } else {
      throw new Error(`Expected JSON response, but got content-type: ${contentType}.`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' && retries > 0) return fetchAPI(endpoint, options, retries - 1);
    throw err;
  }
}
