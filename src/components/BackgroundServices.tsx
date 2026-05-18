import { useEffect } from 'react';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { preloadWebLLM } from '../lib/webllm';
import { useAuthStore } from '../store/useAuthStore';

// Roles that have WebLLM-powered features in their dashboards and benefit
// from eager preloading (Incident Auto-Writer, Patrol Route Suggester,
// Guardian Voice Assistant, Shift Briefing, etc.)
const WEBLLM_EAGER_ROLES = new Set(['tanod', 'admin', 'superadmin']);

export default function BackgroundServices() {
  useSocketConnection();
  useLocationTracking();

  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!profile) return;

    const role = profile.role?.toLowerCase() ?? '';

    if (WEBLLM_EAGER_ROLES.has(role)) {
      // Tanod/Admin: start downloading the model in the background now
      // so it's ready before they open any AI feature.
      preloadWebLLM();
    }
    // Resident: WebLLM loads on-demand when they open SOS Co-pilot or
    // First-Aid Guide. The GuardianAILoader inside those components shows
    // the progress bar at that point.
  }, [profile?.role]);

  return null;
}
