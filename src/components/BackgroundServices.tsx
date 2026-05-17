import { useEffect } from 'react';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { preloadWebLLM } from '../lib/webllm';

export default function BackgroundServices() {
  useSocketConnection();
  useLocationTracking();

  // Kick off WebLLM model download in the background.
  // Silent: no UI shown here — the GuardianAILoader component in each
  // dashboard header handles the visible progress bar.
  useEffect(() => {
    preloadWebLLM(); // no-op if already loaded or loading
  }, []);

  return null;
}
