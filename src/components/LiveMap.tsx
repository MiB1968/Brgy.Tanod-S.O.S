// src/components/LiveMap.tsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTanodStore } from '../store/useTanodStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { useAuthStore } from '../store/useAuthStore';

// Fix default Leaflet marker assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Tanod Marker - with styled badge and visual pulse
const createTanodIcon = (status: string, heading: number = 0) => {
  const colorClass = status === 'responding' ? 'bg-amber-600 border-amber-400' : 'bg-blue-600 border-blue-400';
  const label = status === 'responding' ? '⚡' : '👮';
  return L.divIcon({
    className: 'custom-tanod-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Pulse Effect -->
        <div class="absolute w-12 h-12 rounded-full ${status === 'responding' ? 'bg-amber-500/30' : 'bg-blue-500/20'} animate-ping duration-1000"></div>
        <!-- Main Marker -->
        <div class="w-10 h-10 ${colorClass} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-lg relative z-10 transition-transform duration-300">
          ${label}
        </div>
        <!-- Heading Indicator -->
        <div class="absolute w-4 h-4 rounded-full border border-white bg-red-500 transform origin-center z-20 pointer-events-none shadow" 
             style="transform: rotate(${heading}deg) translateY(-22px);">
          <div class="w-full h-full relative">
            <div class="absolute -top-1 left-1.5 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-white"></div>
          </div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Custom Active SOS Alarm Marker - Animated with Red/Orange Pulse Ring
const createSOSIcon = (type: string) => {
  let emoji = '🚨';
  if (type === 'MEDICAL') emoji = '🩺';
  else if (type === 'FIRE') emoji = '🔥';
  else if (type === 'CRIME') emoji = '👮';
  else if (type === 'FLOOD') emoji = '🌊';
  else if (type === 'VIOLENCE') emoji = '⚠️';

  return L.divIcon({
    className: 'custom-sos-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Giant Alarm Ring -->
        <div class="absolute w-14 h-14 rounded-full bg-red-600/30 animate-ping duration-750"></div>
        <div class="absolute w-10 h-10 rounded-full bg-red-500/40 animate-pulse"></div>
        <!-- Inner core -->
        <div class="w-9 h-9 bg-red-600 rounded-full border-[2.5px] border-white shadow-2xl flex items-center justify-center text-lg z-10 font-bold relative animate-bounce">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

function MapController({ profile }: { profile: any }) {
  const map = useMap();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    
    // Automatically fly map closer to the active user's location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, {
            duration: 1.5,
          });
          ranOnce.current = true;
        },
        () => {
          // Fallback coordinate focus
          map.setView([14.312, 120.95], 13);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [map, profile]);

  return null;
}

export default function LiveMap() {
  const { patrols } = useTanodStore();
  const { alerts } = useIncidentStore();
  const { profile } = useAuthStore();
  const mapRef = useRef<any>(null);

  // Filter for pending and active SOS alarms
  const activeSOS = alerts.filter(a => a.status === 'pending' || a.status === 'responding');

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-700 shadow-2xl h-full w-full bg-[#0a1428]">
      <MapContainer
        center={[14.3120, 120.9500]} // Tanza, Cavite central coordinate
        zoom={13}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Tanod Patrol Unit Markers */}
        {patrols.map((patrol: any, i: number) => {
          const lat = patrol.location?.lat;
          const lng = patrol.location?.lng;
          if (lat === undefined || lng === undefined) return null;

          return (
            <div key={patrol.tanodId || `patrol-${i}`}>
              <Marker
                position={[lat, lng]}
                icon={createTanodIcon(patrol.status || 'patrolling', patrol.heading || 0)}
              >
                <Popup>
                  <div className="text-gray-950 p-1 font-sans">
                    <h4 className="font-bold text-base flex items-center gap-1.5 border-b pb-1 mb-1">
                      👮 {patrol.tanodName || "Barangay Tanod"}
                    </h4>
                    <p className="text-xs mb-1">
                      <strong className="text-gray-600">Status:</strong>{' '}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase ${patrol.status === 'responding' ? 'bg-amber-500 animate-pulse' : 'bg-blue-600'}`}>
                        {patrol.status || 'Active'}
                      </span>
                    </p>
                    <p className="text-xs"><strong className="text-gray-600">Bilis:</strong> {patrol.speed || 0} km/h</p>
                    <p className="text-xs"><strong className="text-gray-600">Updated:</strong> {new Date(patrol.lastUpdate || Date.now()).toLocaleTimeString('en-PH')}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Accuracy Containment Visuals */}
              {patrol.location?.accuracy && patrol.location.accuracy > 0 && (
                <Circle
                  center={[lat, lng]}
                  radius={patrol.location.accuracy}
                  pathOptions={{
                    color: patrol.status === 'responding' ? '#f59e0b' : '#3b82f6',
                    fillColor: patrol.status === 'responding' ? '#f59e0b' : '#3b82f6',
                    fillOpacity: 0.08,
                    weight: 1
                  }}
                />
              )}
            </div>
          );
        })}

        {/* SOS Emergency Event Alarms */}
        {activeSOS.map((sos: any) => {
          const lat = sos.location?.lat;
          const lng = sos.location?.lng;
          if (lat === undefined || lng === undefined) return null;

          return (
            <div key={sos.id}>
              <Marker
                position={[lat, lng]}
                icon={createSOSIcon(sos.type)}
              >
                <Popup>
                  <div className="text-gray-950 p-1 font-sans min-w-[180px]">
                    <h4 className="font-extrabold text-red-600 flex items-center justify-between text-sm uppercase tracking-wide border-b pb-1 mb-1 border-red-100">
                      <span>🚨 {sos.type} SOS</span>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                        {sos.status}
                      </span>
                    </h4>
                    <p className="text-xs font-bold leading-none mb-1 text-gray-800">{sos.residentName}</p>
                    {sos.residentMobile && (
                      <p className="text-[10px] text-gray-500 mb-1.5">Tel: {sos.residentMobile}</p>
                    )}
                    {sos.description && (
                      <p className="text-xs bg-red-50 text-red-950 p-2 rounded border border-red-200 leading-tight mb-2">
                        "{sos.description}"
                      </p>
                    )}
                    <span className="text-[9px] text-gray-400 font-mono block text-right">
                      {new Date(sos.timestamp).toLocaleTimeString('en-PH')}
                    </span>
                  </div>
                </Popup>
              </Marker>

              {/* Glowing hazard zone radius representing incident precision */}
              <Circle
                center={[lat, lng]}
                radius={sos.location?.accuracy || 30}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4 4'
                }}
              />
            </div>
          );
        })}

        <MapController profile={profile} />
      </MapContainer>
    </div>
  );
}
