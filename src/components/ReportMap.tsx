import React, { useEffect } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { OfflineTileLayer } from "./OfflineTileLayer";
import { isValidCoord } from "../lib/utils";

const IncidentIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="font-size: 24px; text-shadow: 0 0 10px rgba(255, 75, 75, 0.5); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; line-height: 1;">📍</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapResizeController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

interface ReportMapProps {
  lat: number;
  lng: number;
}

export default function ReportMap({ lat, lng }: ReportMapProps) {
  if (!isValidCoord(lat, lng)) {
    return (
      <div className="w-full h-[200px] rounded-xl overflow-hidden border border-[#2D3139] flex items-center justify-center bg-black/40 text-white/30 text-xs font-black uppercase tracking-widest font-mono">
        Geodata Incomplete
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] rounded-xl overflow-hidden border border-[#2D3139] shadow-2xl relative mt-4">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        dragging={false}
        scrollWheelZoom={false}
        touchZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
      >
        <MapResizeController />
        <OfflineTileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={IncidentIcon}>
          <Popup>
            <div className="text-black font-bold">Incident Location</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
