import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import socket from '../lib/socket';
import { generic as api } from '../lib/api';
import { db } from '../db/offlineDB';
import { offlineService } from './offlineService';
import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';
import { doc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db as firebaseDb } from '../lib/firebase';
import { TanodLocation, TanodStatus } from '../types/tanod';

/**
 * TanodLocationService
 * 
 * SINGLE SOURCE OF TRUTH for real-time location tracking in Brgy.Tanod-S.O.S.
 *
 * Responsibilities:
 * - Handles both Tanod patrol tracking and high-frequency SOS tracking (3s interval)
 * - Writes location data to PostGIS (location_history table)
 * - Broadcasts location updates via Socket.io
 * - Supports offline queuing via Dexie
 *
 * IMPORTANT:
 * This service replaced the old useLocationTracking.ts and gpsService.ts.
 * Those files are now deprecated and should not be used for new development.
 */
export class TanodLocationService {
  private watchId: number | null = null;
  private lastSent = 0;
  private isTracking = false;
  private onUpdateCallback?: (location: any) => void;
  private customUid?: string;
  private unsubscribeListener: (() => void) | null = null;
  private static instance: TanodLocationService;

  static getInstance() {
    if (!TanodLocationService.instance) {
      TanodLocationService.instance = new TanodLocationService();
    }
    return TanodLocationService.instance;
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  async startTracking(uid?: string, onUpdate?: (location: any) => void) {
    if (uid) {
      this.customUid = uid;
    }
    if (onUpdate) {
      this.onUpdateCallback = onUpdate;
    }

    const { profile } = useAuthStore.getState();
    if (!profile && !uid) return;
    if (profile && (profile.role !== 'tanod' && (profile.role as string) !== 'responder') && !uid) return;

    if (this.isTracking) return; // Already tracking

    // High accuracy tracking options
    const distanceFilter = 30; // meters - to save battery on patrol

    try {
      if (Capacitor.isNativePlatform()) {
        const { requestAllTrackingPermissions, openBatteryOptimizationSettings } =
          await import('../lib/permissions');
        const perms = await requestAllTrackingPermissions();
        if (!perms.fineLocation) {
          console.warn('[TanodTracking] Fine location denied — cannot start');
          return;
        }

        console.log('📱 Starting @capgo/background-geolocation watcher…');
        const watcherId = await BackgroundGeolocation.addWatcher(
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
                  await BackgroundGeolocation.openSettings();
                  await openBatteryOptimizationSettings();
                }
              }
              console.error('[TanodTracking] Native Error:', error);
              return;
            }
            if (location) {
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
        (this as any).nativeWatcherId = watcherId;
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
    
    // Dynamic battery-aware adaptive GPS ping throttling
    let throttleInterval = 8000; // default 8 seconds for real-time tracking
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        const level = (battery.level || 1) * 100;
        if (level < 15) {
          throttleInterval = 90000; // slow down to 90 seconds if critically low (<15%)
          console.warn('[BatteryGuard] Critical power (<15%). GPS throttle interval locked at 90s.');
        } else if (level < 30) {
          throttleInterval = 30000; // slow down to 30 seconds if low (<30%)
          console.log('[BatteryGuard] Low power (<30%). GPS throttle interval locked at 30s.');
        }
      }
    } catch (e) {
      // standard fallback
    }

    if (now - this.lastSent < throttleInterval) return;

    const { profile } = useAuthStore.getState();
    if (!profile) return;

    const currentUid = this.customUid || profile.uid || profile.id;

    const locationData = {
      user_id: currentUid,
      role: profile.role,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      name: profile.name || 'Tanod',
      accuracy: position.coords.accuracy,
      status: profile.activeAlertId ? 'responding' : 'patrolling',
    };

    // Update local store for patrols
    useTanodStore.getState().updatePatrol({
      id: currentUid,
      tanodId: currentUid,
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

    // Write to Firestore for persistent, real-time sync
    if (currentUid) {
      const fsLocation: Partial<TanodLocation> = {
        uid: currentUid,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        timestamp: position.timestamp || Date.now(),
        status: (profile.activeAlertId ? 'responding' : 'on_patrol') as TanodStatus,
      };

      await this.updateTanodLocation(currentUid, fsLocation);

      if (this.onUpdateCallback) {
        try {
          this.onUpdateCallback({
            ...fsLocation,
            name: profile.name || 'Tanod',
          });
        } catch (cbErr) {
          console.error('[TanodTracking] onUpdateCallback failed:', cbErr);
        }
      }
    }

    // Send to server (real-time matching location.handler.ts)
    if (socket.connected) {
      socket.emit('location_update', locationData);
    }

    // Send via CockroachDB HTTP Api (Heartbeat) or queue if offline
    try {
      await api.update('gps/heartbeat', {
        id: currentUid,
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
          userId: currentUid,
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
    try {
      if (Capacitor.isNativePlatform() && (this as any).nativeWatcherId) {
        await BackgroundGeolocation.removeWatcher({ id: (this as any).nativeWatcherId });
        (this as any).nativeWatcherId = null;
      }
      if (typeof this.watchId === 'number') {
        navigator.geolocation.clearWatch(this.watchId);
      }
      this.watchId = null;
    } catch (e) {
      console.warn('[TanodTracking] stop error', e);
    }
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

  async updateTanodLocation(uid: string, location: Partial<TanodLocation>) {
    try {
      const ref = doc(firebaseDb, 'tanod_locations', uid);
      await setDoc(ref, {
        ...location,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.error('[TanodTracking] Firestore updateTanodLocation failed:', err);
    }
  }

  async updateTanodStatus(uid: string, status: TanodStatus) {
    try {
      const ref = doc(firebaseDb, 'tanod_locations', uid);
      await setDoc(ref, { status, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('[TanodTracking] Firestore updateTanodStatus failed:', err);
    }
  }

  listenToActiveTanods(callback: (tanods: TanodLocation[]) => void) {
    try {
      const q = query(
        collection(firebaseDb, 'tanod_locations'),
        where('status', 'in', ['available', 'on_patrol', 'responding'])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tanods: TanodLocation[] = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
        })) as TanodLocation[];

        callback(tanods);
        
        // Dynamic sync to local Zustand store to automatically update all map views
        tanods.forEach(t => {
          useTanodStore.getState().updatePatrol({
            id: t.uid,
            tanodId: t.uid,
            tanodName: (t as any).name || 'Tanod',
            location: {
              lat: t.lat,
              lng: t.lng,
              accuracy: t.accuracy ? Math.round(t.accuracy) : undefined
            },
            isActive: t.status !== 'offline',
            status: t.status === 'responding' ? 'responding' : 'patrolling',
            lastUpdate: new Date(t.timestamp || Date.now()).toISOString()
          });
        });
      }, (error) => {
        console.error('[TanodTracking] Firestore listenToActiveTanods snapshot error:', error);
      });

      this.unsubscribeListener = unsubscribe;
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (err) {
      console.error('[TanodTracking] Firestore listenToActiveTanods setup failed:', err);
      return () => {};
    }
  }
}

export const tanodLocationService = TanodLocationService.getInstance();
