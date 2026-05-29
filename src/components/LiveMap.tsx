// src/components/LiveMap.tsx
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTanodStore } from "../store/useTanodStore";

// Custom red icon for Tanods
const tanodIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [0, -35],
});

function MapUpdater({ patrols, resizeTrigger }: { patrols: any[], resizeTrigger: number }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map, resizeTrigger]);

  useEffect(() => {
    if (patrols.length > 0) {
      const bounds = patrols.map(p => [p.location.lat, p.location.lng] as [number, number]);
      if (bounds.length > 1) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
      } else if (bounds[0][0] && bounds[0][1]) {
        map.flyTo(bounds[0], 15, { duration: 1.5 });
      }
    }
  }, [patrols, map]);

  return null;
}

export default function LiveMap() {
  const { patrols, updatePatrol } = useTanodStore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = React.useState(0);
  const lastSize = React.useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      
      const { width, height } = entry.contentRect;
      // Only refresh trigger if the size actually changed more than a threshold to avoid oscillating loops
      if (Math.abs(width - lastSize.current.width) > 2 || Math.abs(height - lastSize.current.height) > 2) {
        lastSize.current = { width, height };
        setMapKey(prev => prev + 1);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Inject a demo patrol if none exists so the user isn't stuck with an empty map
    if (patrols.length === 0) {
      updatePatrol({
        id: 'demo-tanod-1',
        tanodId: 'demo-tanod-1',
        tanodName: 'Bgy. Patrol 01',
        location: { lat: 14.5760, lng: 121.0850 },
        isActive: true,
        status: 'patrolling',
        lastUpdate: new Date().toISOString()
      });
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[70vh] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
      <MapContainer
        center={[14.5760, 121.0850]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
          crossOrigin={true}
          bounds={L.latLngBounds(L.latLng(4.0, 116.0), L.latLng(21.0, 127.0))}
        />

        <MapUpdater patrols={patrols} resizeTrigger={mapKey} />

        {patrols.map((patrol: any) => (
          <Marker
            key={patrol.tanodId}
            position={[patrol.location.lat, patrol.location.lng]}
            icon={tanodIcon}
          >
            <Popup className="custom-popup">
              <div className="text-center min-w-[160px]">
                <div className="font-bold text-lg">{patrol.tanodName || "Tanod"}</div>
                <div className="text-green-500 text-sm flex items-center justify-center gap-1 mt-1">
                  ● LIVE
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(patrol.lastUpdate).toLocaleTimeString()}
                </div>
                {patrol.speed && (
                  <div className="text-xs mt-1">Speed: {patrol.speed} km/h</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
