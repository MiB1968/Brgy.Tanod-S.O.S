// src/components/LiveMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTanodStore } from '../store/useTanodStore';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LiveMap() {
  const { patrols } = useTanodStore();

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
      <MapContainer
        center={[14.5760, 121.0850]} // Default to Cavite / Calabarzon area
        zoom={13}
        className="h-[65vh] w-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {patrols.map((patrol: any, i: number) => (
          <Marker
            key={patrol.tanodId || `patrol-${i}`}
            position={[patrol.location.lat, patrol.location.lng]}
            icon={redIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>{patrol.tanodName || "Tanod"}</strong><br />
                Speed: {patrol.speed || 0} km/h<br />
                Updated: {new Date(patrol.lastUpdate).toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
