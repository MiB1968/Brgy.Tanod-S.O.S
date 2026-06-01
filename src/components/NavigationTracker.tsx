import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as ReactSentry from '@sentry/react';

const NavigationTracker = () => {
  const location = useLocation();

  useEffect(() => {
    ReactSentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${location.pathname}`,
      level: 'info',
      data: {
        pathname: location.pathname,
        search: location.search,
      },
    });
  }, [location]);

  return null;
};

export default NavigationTracker;
