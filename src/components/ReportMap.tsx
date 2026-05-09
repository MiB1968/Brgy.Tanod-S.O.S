import React from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import { OfflineTileLayer } from './OfflineTileLayer';
import { isValidCoord } from "../lib/utils";

const IncidentIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="font-size: 24px; text-align: center; text-shadow: 0 0 10px rgba(255, 75, 75, 0.5);">📍</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

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
        zoomControl={false}
      >
        <OfflineTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
