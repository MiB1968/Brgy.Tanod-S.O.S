// src/utils/geo.ts

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula. Returns distance in kilometers.
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * Filter Tanods / Responders located within a specific physical radius from a critical incident origin point.
 */
export function getNearbyTanods(
  tanods: any[],
  userLat: number,
  userLng: number,
  radiusKm = 3
) {
  return tanods.filter(tanod => {
    if (typeof tanod.lat !== 'number' || typeof tanod.lng !== 'number') return false;
    const distance = getDistanceFromLatLonInKm(
      userLat, userLng,
      tanod.lat, tanod.lng
    );
    return distance <= radiusKm;
  });
}
