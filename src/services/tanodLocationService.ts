import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import socket from '../lib/socket';
import { generic as api } from '../lib/api';
import { db } from '../db/offlineDB';
import { offlineService } from './offlineService';
import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';

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

    // High accuracy tracking options
    const distanceFilter = 30; // meters - to save battery on patrol

    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Background Geolocation
        console.log('📱 Starting native background geolocation tracking...');
        await BackgroundGeolocation.start(
          {
            backgroundMessage: "Tanod tracking active for community safety.",
            backgroundTitle: "Brgy Tanod SOS Background Protocol",
            requestPermissions: true,
            stale: false,
            distanceFilter: distanceFilter,
          },
          async (location, error) => {
            if (error) {
              if ((error as any).code === "NOT_AUTHORIZED") {
                console.warn("📍 Background location not authorized. Prompting settings.");
                if (window.confirm("Location is required for tracking. Open Settings?")) {
                  BackgroundGeolocation.openSettings();
                }
              }
              console.error('[TanodTracking] Native Error:', error);
              return;
            }
            if (location) {
              // Convert to the fallback Position format to pass to our handler
              const syntheticPosition = {
                coords: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  accuracy: location.accuracy,
                  speed: location.speed || 0,
                  heading: location.bearing || 0,
                  altitude: location.altitude || null,
                  altitudeAccuracy: location.altitudeAccuracy || null
                },
                timestamp: location.time || Date.now()
              } as GeolocationPosition;
              
              await this.handlePosition(syntheticPosition);
            }
          }
        );
      } else {
        // Fallback to standard web API
        if ('permissions' in navigator) {
          try {
            const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            if (perm.state === 'denied') {
              console.warn('📍 Web Geolocation permission denied');
              return;
            }
          } catch (e) { /* ignore */ }
        }

        const options: PositionOptions = {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        };

        this.watchId = navigator.geolocation.watchPosition(
          (position) => this.handlePosition(position),
          (error) => {
            console.error('[TanodTracking] Web Error:', error);
          },
          options
        );
      }

      this.isTracking = true;
      console.log('✅ Tanod background tracking started');

      // Sync any leftover offline coordinates immediately upon track launch
      this.syncOfflineData();
    } catch (err) {
      console.error('⚠️ Failed to start tracking:', err);
    }
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

  async stopTracking() {
    if (Capacitor.isNativePlatform()) {
      await BackgroundGeolocation.stop();
    }
    if (typeof this.watchId === 'number') {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.isTracking = false;
    console.log('⏹️ Tanod background tracking stopped');
  }

  // Background behavior (when tab is hidden/re-opened)
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      // In native apps, BackgroundGeolocation handles this. Only needed for web.
      if (!Capacitor.isNativePlatform()) {
        if (document.visibilityState === 'visible' && !this.isTracking) {
          this.startTracking();
        } else {
          // Continue with lower frequency when backgrounded
          console.log('[TanodTracking] Web App backgrounded');
        }
      }
    });

    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - syncing offline location reports');
      this.syncOfflineData();
    });
  }

  async setupGeofencing(hotspots: Array<{ id: string; lat: number; lng: number; radius: number }>) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { profile } = useAuthStore.getState();
      
      // We don't currently have a geofence webhook, skipping the main geofencing setup but adding circular spots
      try {
        await BackgroundGeolocation.setupGeofencing({
          notifyOnEntry: true,
          notifyOnExit: true,
          payload: { tanodId: profile?.id || profile?.uid }
        });
      } catch (e: any) {
        if (e.message !== "Not implemented on web.") {
          console.warn("Geofence base setup warning:", e);
        }
      }

      // Add individual circular geofences (e.g., barangay hotspots)
      for (const spot of hotspots) {
        await BackgroundGeolocation.addGeofence({
          identifier: spot.id,
          latitude: spot.lat,
          longitude: spot.lng,
          radius: spot.radius, // meters
          notifyOnEntry: true,
          notifyOnExit: false
        });
      }
    } catch (e) {
      console.error('Geofence setup failed', e);
    }
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
