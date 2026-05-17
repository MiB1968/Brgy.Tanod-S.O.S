import { useSocketConnection } from '../hooks/useSocketConnection';
import { useLocationTracking } from '../hooks/useLocationTracking';

export default function BackgroundServices() {
  useSocketConnection();
  useLocationTracking();

  return null;
}
