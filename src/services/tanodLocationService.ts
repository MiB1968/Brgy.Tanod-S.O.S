import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import socket from '../lib/socket';
import { generic as api } from '../lib/api';
import { db } from '../db/offlineDB';
import { offlineService } from './offlineService';

export class TanodLocationService {
  private watchId: number | null = null;
  private lastSent = 0;
  private isTracking = false;
  private static instance: TanodLocationService;

  static getInstance() {
    if (!TanodLocationService.instance) {
      TanodLocationService.instance = new TanodLocationService();
    }
    return TanodLocationService.instance;
  }

  async startTracking() {
    const { profile } = useAuthStore.getState();
    if (!profile || (profile.role !== 'tanod' && (profile.role as string) !== 'responder')) return;

    if (this.isTracking) return; // Already tracking

    // Permission check
    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          console.warn('📍 Geolocation permission denied');
          return;
        }
      } catch (e) { /* ignore */ }
    }

    // High accuracy tracking
    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => {
        console.error('[TanodTracking] Error:', error);
      },
      options
    );

    this.isTracking = true;
    console.log('✅ Tanod background tracking started');

    // Sync any leftover offline coordinates immediately upon track launch
    this.syncOfflineData();
  }

  private async handlePosition(position: GeolocationPosition) {
    const now = Date.now();
    if (now - this.lastSent < 8000) return; // Throttle to ~8 seconds

    const { profile } = useAuthStore.getState();
    if (!profile) return;

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

    // Send via CockroachDB HTTP Api (Heartbeat) or queue if offline
    try {
      await api.update('gps/heartbeat', {
        id: profile.id || profile.uid,
        role: profile.role,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || 0,
        heading: position.coords.heading || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[TanodTracking] Direct heartbeat failed, saving locally:', err);
      try {
        await db.pendingLocations.add({
          id: crypto.randomUUID(),
          userId: profile.id || profile.uid,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? undefined,
          heading: position.coords.heading ?? undefined,
          status: 'pending'
        });
      } catch (dbErr) {
        console.error('[TanodTracking] Failed to write offline coordinate to Dexie:', dbErr);
      }
    }

    this.lastSent = now;
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('⏹️ Tanod background tracking stopped');
  }

  // Background behavior (when tab is hidden/re-opened)
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isTracking) {
        this.startTracking();
      } else {
        // Continue with lower frequency when backgrounded
        console.log('[TanodTracking] App backgrounded - continuing tracking');
      }
    });

    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - syncing offline location reports');
      this.syncOfflineData();
    });
  }

  async syncOfflineData() {
    if (navigator.onLine) {
      const result = await offlineService.syncPendingLocations();
      if (result.success > 0) {
        console.log(`📡 [TanodTracking] Successfully synced ${result.success} offline GPS tracks.`);
      }
    }
  }
}

export const tanodLocationService = TanodLocationService.getInstance();
