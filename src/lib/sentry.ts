import * as CapacitorSentry from '@sentry/capacitor';
import * as ReactSentry from '@sentry/react';
import { Replay } from '@sentry/replay';
import releaseInfo from '../release.json';

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] DSN not found. Sentry will not be initialized.');
    return;
  }

  CapacitorSentry.init({
    dsn,
    release: releaseInfo?.release || 'unknown',
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  }, (options: any) => {
    ReactSentry.init({
      ...options,
      integrations: [
        ReactSentry.browserTracingIntegration(),
        new Replay({
          // Conservative settings for low-end devices
          maskAllText: true,
          blockAllMedia: true,
          maskAllInputs: true,
          networkDetailAllowUrls: ['/api/'], // Only capture API calls
        }),
      ],
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.15 : 1.0,
      replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.05 : 0.5,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event: any) {
        if (event.exception?.values?.[0]?.value?.includes('Network Error')) {
          return null;
        }
        return event;
      },
    });
  });
};
