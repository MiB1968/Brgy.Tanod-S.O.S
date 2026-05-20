import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import socket from '../lib/socket';

export class TanodLocationService {
  private watchId: number | null = null;
  private lastSent = 0;
  private static instance: TanodLocationService;

  static getInstance() {
    if (!TanodLocationService.instance) {
      TanodLocationService.instance = new TanodLocationService();
    }
    return TanodLocationService.instance;
  }

  startTracking() {
    const { profile } = useAuthStore.getState();
    if (!profile || (profile.role !== 'tanod' && (profile.role as string) !== 'responder')) return;

    if (this.watchId !== null) return; // Already tracking

    // High accuracy tracking
    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - this.lastSent < 8000) return; // Throttle to ~8 seconds

        const locationData = {
          user_id: profile.id || profile.uid,
          role: profile.role,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: profile.name || 'Tanod',
          accuracy: position.coords.accuracy,
          status: profile.activeAlertId ? 'responding' : 'patrolling',
        };

        // Update local store for patrols
        useTanodStore.getState().updatePatrol({
          id: profile.id || profile.uid,
          tanodId: profile.id || profile.uid,
          tanodName: profile.name || 'Tanod',
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          },
          isActive: true,
          status: profile.activeAlertId ? 'responding' : 'patrolling',
          lastUpdate: new Date().toISOString()
        });

        // Send to server (real-time matching location.handler.ts)
        if (socket.connected) {
          socket.emit('location_update', locationData);
        }

        this.lastSent = now;
      },
      (error) => {
        console.error('[TanodTracking] Error:', error);
      },
      options
    );

    console.log('✅ Tanod background tracking started');
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    console.log('⏹️ Tanod background tracking stopped');
  }

  // For better background behavior (when tab is hidden)
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.startTracking();
      } else {
        // Continue with lower frequency when backgrounded
        console.log('[TanodTracking] App backgrounded - continuing tracking');
      }
    });
  }
}

export const tanodLocationService = TanodLocationService.getInstance();
