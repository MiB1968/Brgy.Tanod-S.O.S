import * as Sentry from '@sentry/react';
import releaseInfo from '../release.json';

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] DSN not found. Sentry will not be initialized.');
    return;
  }

  Sentry.init({
    dsn,
    release: releaseInfo?.release || 'unknown',
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        networkDetailAllowUrls: ['/api/'],
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.15 : 1.0,
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.05 : 0.5,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes('Network Error')) {
        return null;
      }
      return event;
    },
  });
};
