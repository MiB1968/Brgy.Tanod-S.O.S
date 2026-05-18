import { useEffect } from 'react';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { preloadWebLLM } from '../lib/webllm';

export default function BackgroundServices() {
  useSocketConnection();
  useLocationTracking();

  useEffect(() => {
    preloadWebLLM();
  }, []);

  return null;
}
