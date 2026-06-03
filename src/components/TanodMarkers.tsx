import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTanodIntegration } from '../hooks/useTanodIntegration';

// Custom icons depending on Tanod status
const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const patrolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const respondingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const offlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export const TanodMarkers: React.FC = () => {
  const { activeTanods } = useTanodIntegration();

  return (
    <>
      {activeTanods.map((tanod) => {
        let statusIcon = activeIcon;
        if (tanod.status === 'on_patrol') {
          statusIcon = patrolIcon;
        } else if (tanod.status === 'responding') {
          statusIcon = respondingIcon;
        } else if (tanod.status === 'offline') {
          statusIcon = offlineIcon;
        }

        return (
          <Marker
            key={tanod.uid}
            position={[tanod.lat, tanod.lng]}
            icon={statusIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[150px] text-zinc-900">
                <h4 className="font-bold text-sm text-zinc-950">Tanod Responder</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${
                    tanod.status === 'responding' ? 'bg-amber-500 animate-pulse' :
                    tanod.status === 'on_patrol' ? 'bg-blue-500' :
                    tanod.status === 'available' ? 'bg-emerald-500' : 'bg-zinc-500'
                  }`} />
                  <span className="text-xs uppercase font-semibold text-zinc-500 tracking-wider">
                    {tanod.status.replace('_', ' ')}
                  </span>
                </div>
                {tanod.speed !== undefined && (
                  <p className="text-xs text-zinc-500 mt-1">Speed: {Math.round(tanod.speed)} m/s</p>
                )}
                <p className="text-[10px] text-zinc-400 mt-2 border-t pt-1">
                  Updated: {new Date(tanod.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
export default TanodMarkers;
