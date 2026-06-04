/**
 * @file gpsService.ts
 * @deprecated — DO NOT USE THIS FILE ANYMORE
 *
 * REASON:
 * This service was replaced by the new consolidated GPS system.
 * All real-time location tracking is now handled by:
 *   - src/services/tanodLocationService.ts (client)
 *   - src/server/sockets/handlers/location.handler.ts (server + PostGIS)
 *
 * This file is kept only as a temporary safety stub.
 * It should eventually be deleted after full migration.
 *
 * WARNING:
 * Using this file can cause duplicate location tracking,
 * higher battery usage, and broken high-frequency SOS updates.
 */

export const gpsService = {
  /**
   * @deprecated
   * This method does nothing useful anymore.
   * Use tanodLocationService.startTracking() instead.
   */
  startTracking: () => {
    console.warn(
      '[gpsService] DEPRECATED — This file is no longer used. ' +
      'Use tanodLocationService.startTracking() instead.'
    );
  },

  /**
   * @deprecated
   * This method does nothing useful anymore.
   * Use tanodLocationService.stopTracking() instead.
   */
  stopTracking: () => {
    console.warn(
      '[gpsService] DEPRECATED — This file is no longer used. ' +
      'Use tanodLocationService.stopTracking() instead.'
    );
  },
};
