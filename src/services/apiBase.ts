/**
 * Base API Client for Brgy. Tanod S.O.S.
 * Handles authentication, timeouts, and error handling for all service calls.
 */

import * as safeStorage from '../lib/safeStorage';
import * as ReactSentry from '@sentry/react';
import { getToken } from 'firebase/app-check';
import { auth, appCheck } from '../lib/firebase';

const API_BASE = '/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> {
  let token = safeStorage.getItem('token');

  // PROACTIVE REFRESH: If Firebase is the source of truth, ensure we have a fresh token.
  // We prefer the live SDK token over the potentially stale SafeStorage one.
  if (auth.currentUser) {
    try {
      // getIdToken(false) is fast and returns the cached token if it's still valid,
      // or fetches a new one if it has expired within its own internal lifecycle.
      const freshToken = await auth.currentUser.getIdToken();
      if (freshToken) {
        token = freshToken;
        // Keep storage in sync
        if (safeStorage.getItem('token') !== freshToken) {
          safeStorage.setItem('token', freshToken);
        }
      }
    } catch (err) {
      console.warn('[API] Proactive token refresh failed:', err);
    }
  }
  
  let appCheckTokenString = '';
  if (appCheck) {
    try {
      const appCheckTokenObj = await getToken(appCheck, false); // false = don't force refresh
      appCheckTokenString = appCheckTokenObj.token;
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        const lastWarnKey = '__last_app_check_warn__';
        const now = Date.now();
        const lastWarn = (window as any)[lastWarnKey] || 0;
        if (now - lastWarn > 60000) { // Log at most once per minute
          (window as any)[lastWarnKey] = now;
          console.warn('[API] Could not retrieve Firebase App Check token (throttled):', err.message || err);
        }
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && token !== 'cookie-auth' ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(appCheckTokenString ? { 'X-Firebase-AppCheck': appCheckTokenString } : {}),
    ...options.headers,
  };

  ReactSentry.addBreadcrumb({
    category: 'http',
    message: `${options.method || 'GET'} ${endpoint}`,
    level: 'info',
    data: {
      endpoint,
      method: options.method || 'GET',
    },
  });

  const timeout = endpoint.includes('sync') ? 60000 : 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[API] Request timed out for: ${endpoint}`);
    controller.abort();
  }, timeout);

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
      ReactSentry.addBreadcrumb({
        category: 'http',
        message: `API Error: ${endpoint}`,
        level: 'error',
        data: {
          endpoint,
          status: response.status,
        },
      });

      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        await new Promise(res => setTimeout(res, 1000 * (3 - retries)));
        return fetchAPI(endpoint, options, retries - 1);
      }

      if (response.status === 401) {
        // ALIGNMENT: Match the listener name in AuthContext.tsx
        window.dispatchEvent(new Event('auth:token_expired'));
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
    
    ReactSentry.addBreadcrumb({
      category: 'http',
      message: `API Request Failed: ${endpoint}`,
      level: 'error',
      data: {
        endpoint,
        error: err.message,
      },
    });

    if (err.name === 'AbortError' && retries > 0) return fetchAPI(endpoint, options, retries - 1);
    throw err;
  }
}
