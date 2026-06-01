import * as Sentry from '@sentry/react';

export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};
