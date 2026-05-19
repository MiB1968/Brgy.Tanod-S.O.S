// src/lib/ors.ts
import { toast } from 'react-hot-toast';

export async function fetchRoute(start: [number, number], end: [number, number]) {
  try {
    const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
    
    if (!ORS_API_KEY) {
      console.warn('VITE_ORS_API_KEY is not defined. Skipping routing.');
      return null;
    }

    // ORS takes coordinates as [lon, lat]
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Decode coordinates or just use the geometry.coordinates (which are [lon, lat])
      const coords = data.features[0].geometry.coordinates;
      // Convert back to [lat, lon] for Leaflet
      return coords.map((c: number[]) => [c[1], c[0]]);
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch ORS route:', err);
    return null;
  }
}
