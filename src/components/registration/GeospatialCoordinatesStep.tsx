import React, { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../lib/utils';
import { OfflineTileLayer } from '../OfflineTileLayer';
import { RegistrationFormData } from './types';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 18);
    }
  }, [center, map]);

  useEffect(() => {
    let isMounted = true;

    const safeInvalidate = () => {
      if (isMounted && map && (map as any)._mapPane) {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) {
          // Ignore leaflet errors if container is detached
        }
      }
    };

    const observer = new window.ResizeObserver(() => {
      safeInvalidate();
    });

    const container = map.getContainer();
    observer.observe(container);

    // Multiple fallbacks for React render cycles
    const timers = [
      setTimeout(safeInvalidate, 10),
      setTimeout(safeInvalidate, 100),
      setTimeout(safeInvalidate, 500),
      setTimeout(safeInvalidate, 1000)
    ];

    map.whenReady(() => {
      setTimeout(safeInvalidate, 0);
    });

    return () => {
      isMounted = false;
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [map]);

  return null;
}

function LocationPicker({ onLocationSelect, initialPos }: { onLocationSelect: (lat: number, lng: number) => void, initialPos: [number, number] }) {
  const [position, setPosition] = useState<[number, number] | null>(initialPos);

  // Update internal marker if initialPos changes from outside (e.g. detectLocation)
  useEffect(() => {
    setPosition(initialPos);
  }, [initialPos]);

  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={DefaultIcon} />
  );
}

interface Props {
  formData: RegistrationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationFormData>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  detectLocation: () => void;
  detecting: boolean;
  reverseGeocode: (lat: number, lng: number) => void;
}

export default function GeospatialCoordinatesStep({ formData, setFormData, setStep, detectLocation, detecting, reverseGeocode }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-info" />
        </div>
        GEOSPATIAL COORDINATES
      </h2>
      <div className="space-y-6">
        <div className="h-80 rounded-[40px] overflow-hidden border border-white/10 shadow-command relative group">
          <MapContainer
            center={[formData.gpsLat, formData.gpsLng]}
            zoom={18}
            className="w-full h-full grayscale-[0.5] contrast-[1.2] brightness-[0.8]"
            scrollWheelZoom={false}
          >
            <OfflineTileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <MapUpdater center={[formData.gpsLat, formData.gpsLng]} />
            <LocationPicker
              initialPos={[formData.gpsLat, formData.gpsLng]}
              onLocationSelect={(lat, lng) => {
                setFormData({...formData, gpsLat: lat, gpsLng: lng});
                reverseGeocode(lat, lng);
              }}
            />
          </MapContainer>

          <div className="absolute top-6 right-6 z-[1000] glass-panel border-white/20 px-5 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-[0.2em] font-mono shadow-xl">
            ADJUST PIN MANUALLY
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={detectLocation}
            disabled={detecting}
            className={cn(
              "w-full py-5 rounded-[24px] flex items-center justify-center gap-4 font-black italic uppercase tracking-[0.4em] transition-all shadow-2xl font-mono text-xs",
              detecting
                ? "bg-info/30 cursor-wait animate-pulse"
                : "bg-info text-white hover:scale-[1.02] active:scale-[0.98] shadow-info/20"
            )}
          >
            {detecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                SYNCING GPS ENGINES...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" /> PINPOINT MY POSITION
              </>
            )}
          </button>

          <AnimatePresence>
            {formData.address && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-bg/50 border border-white/5 rounded-3xl p-6 flex gap-4"
              >
                <MapPin className="w-6 h-6 text-emergency shrink-0" />
                <div className="min-w-0">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1 font-mono">Detected Address</p>
                   <p className="text-xs text-white/80 font-bold leading-relaxed font-mono italic">"{formData.address}"</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-6 pb-2">
           <div className="space-y-2">
             <p className="text-[9px] font-black tracking-[0.3em] text-white/20 uppercase ml-2 font-mono">Latitude Ref</p>
             <div className="bg-brand-bg/50 border border-white/5 rounded-2xl p-4 text-sm text-white/40 font-mono italic">{formData.gpsLat.toFixed(8)}</div>
           </div>
           <div className="space-y-2">
             <p className="text-[9px] font-black tracking-[0.3em] text-white/20 uppercase ml-2 font-mono">Longitude Ref</p>
             <div className="bg-brand-bg/50 border border-white/5 rounded-2xl p-4 text-sm text-white/40 font-mono italic">{formData.gpsLng.toFixed(8)}</div>
           </div>
        </div>
      </div>
      <div className="flex gap-4 pt-6">
        <button type="button" onClick={() => setStep(2)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs text-white/60">BACK</button>
        <button type="button" onClick={() => setStep(4)} className="flex-1 py-5 bg-emergency text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-red uppercase tracking-widest font-mono text-xs italic">PROCEED TO SEC-4</button>
      </div>
    </div>
  );
}
