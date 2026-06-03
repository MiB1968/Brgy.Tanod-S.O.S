/**
 * @file gpsService.ts
 * @deprecated This file is no longer used in production.
 *
 * REASON FOR DEPRECATION:
 * This service emitted 'tanod_move' and listened for 'tanod_locations',
 * neither of which exist in the server socket handlers.
 * All realtime GPS tracking has been consolidated into tanodLocationService.ts.
 */

export const gpsService = {
  startTracking: () => {
    console.warn('[gpsService] DEPRECATED');
  },
  stopTracking: () => {
    console.warn('[gpsService] DEPRECATED');
  },
};
