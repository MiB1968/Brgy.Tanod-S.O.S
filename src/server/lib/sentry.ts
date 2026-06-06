import * as Sentry from '@sentry/node';
import releaseInfo from '../../release.json';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] Backend DSN not found. Sentry disabled.');
    return;
  }

  const integrations: any[] = [
    Sentry.httpIntegration(),
  ];

  try {
    // Dynamically require to prevent compile-time/runtime hard crashes on platforms lacking native bindings
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    if (nodeProfilingIntegration) {
      integrations.push(nodeProfilingIntegration());
      console.log('[Sentry] Profiling integration loaded');
    }
  } catch (err: any) {
    console.warn('[Sentry] Profiling integration failed to load (non-blocking, profiling disabled):', err.message);
  }

  Sentry.init({
    dsn,
    release: releaseInfo?.release || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    integrations,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
  });

  console.log('[Sentry] Backend initialized successfully');
};
