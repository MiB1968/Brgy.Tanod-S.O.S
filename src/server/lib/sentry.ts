import * as Sentry from '@sentry/node';
import releaseInfo from '../../release.json';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] Backend DSN not found. Sentry disabled.');
    return;
  }

  Sentry.init({
    dsn,
    release: releaseInfo?.release || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.httpIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
  });

  console.log('[Sentry] Backend initialized successfully');
};
