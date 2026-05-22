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

function MapUpdater({ patrols }: { patrols: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (patrols.length > 0) {
      const bounds = patrols.map(p => [p.location.lat, p.location.lng] as [number, number]);
      if (bounds.length > 1) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
      } else {
        map.flyTo(bounds[0], 15, { duration: 1.5 });
      }
    }
  }, [patrols, map]);

  return null;
}

export default function LiveMap() {
  const { patrols } = useTanodStore();

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-950">
      <MapContainer
        center={[14.5760, 121.0850]} // Default to Tanza / Cavite area
        zoom={13}
        className="h-[65vh] w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <MapUpdater patrols={patrols} />

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
