import React, { useEffect, useState } from 'react';
import { MapContainer, Circle, useMap } from "react-leaflet";
import L from 'leaflet';
import { OfflineTileLayer } from '../OfflineTileLayer';
import { isValidCoord } from "../../lib/utils";
import { motion } from 'motion/react';
import { Activity, Flame, ShieldAlert, Waves, MapPin } from 'lucide-react';
import * as api from '../../lib/api';

interface HeatmapPoint {
  id: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: string;
}

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

const getSev = (type: string) => {
  switch (type.toUpperCase()) {
    case 'FIRE': return { color: "#FF8C00" };
    case 'CRIME': return { color: "#EF4444" };
    case 'FLOOD': return { color: "#3B82F6" };
    case 'MEDICAL': return { color: "#06B6D4" };
    default: return { color: "#8B5CF6" };
  }
};

export function LiveHeatmap() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const heatmap: any[] = [];
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const alertsList = await api.alerts.getAll();
        
        alertsList.forEach((data: any) => {
          let ts = 0;
          if (data.created_at) ts = typeof data.created_at === 'string' ? new Date(data.created_at).getTime() : data.created_at;
          else if (data.timestamp) ts = typeof data.timestamp === 'string' ? new Date(data.timestamp).getTime() : data.timestamp;
          
          if (ts && Math.abs(ts - Date.now()) < 5 * 365 * 24 * 60 * 60 * 1000) {
            if (ts >= thirtyDaysAgo) {
              let lat, lng;
              if (data.location?.lat) { lat = data.location.lat; lng = data.location.lng; }
              else if (data.lat) { lat = data.lat; lng = data.lng; }
              else if (data.latitude) { lat = data.latitude; lng = data.longitude; }
              
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                heatmap.push({
                  id: data.id,
                  type: data.type || 'UNKNOWN',
                  lat: parseFloat(lat as any),
                  lng: parseFloat(lng as any),
                  timestamp: ts
                });
              }
            }
          }
        });
        
        setPoints(heatmap);
      } catch (err) {
        console.error("Heatmap load failure", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'FIRE': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'CRIME': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'FLOOD': return <Waves className="w-4 h-4 text-blue-500" />;
      case 'MEDICAL': return <Activity className="w-4 h-4 text-cyan-500" />;
      default: return <MapPin className="w-4 h-4 text-white/40" />;
    }
  };

  if (loading) return <div className="h-full w-full bg-black/20 animate-pulse rounded-xl" />;

  const defaultCenter = [14.6091, 121.0223];
  const centerLat = points[0]?.lat && isValidCoord(points[0].lat, points[0].lng) ? points[0].lat : defaultCenter[0];
  const centerLng = points[0]?.lng && isValidCoord(points[0].lat, points[0].lng) ? points[0].lng : defaultCenter[1];

  return (
    <div className="relative h-full w-full group">
      <div className="absolute inset-0 z-0 bg-[#0A0A0F]">
        <MapContainer 
          center={[centerLat, centerLng] as any} 
          zoom={14} 
          style={{ height: "100%", width: "100%", zIndex: 1 }}
          zoomControl={false}
        >
          <MapResizeController />
          <OfflineTileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          {points.map((pt, i) => {
            if (!isValidCoord(pt.lat, pt.lng)) return null;
            const c = getSev(pt.type);
            return (
              <React.Fragment key={`h-${pt.id}-${i}`}>
                <Circle center={[pt.lat, pt.lng]} radius={150} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.1, weight: 0, interactive: false }} />
                <Circle center={[pt.lat, pt.lng]} radius={50} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.4, weight: 0, interactive: false }} />
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
      
      {/* Overlay Stats */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
        <div className="glass-panel px-3 py-2 rounded-xl border-white/5 bg-black/60 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest font-mono">Incident Density</p>
          <p className="text-xl font-black text-white italic font-mono">{points.length} <span className="text-[10px] not-italic text-white/40 font-bold ml-1">REPORTS_30D</span></p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[400] glass-panel p-3 rounded-xl border-white/5 bg-black/60 backdrop-blur-xl space-y-2 pointer-events-none">
        <p className="text-[8px] font-black uppercase text-white/20 tracking-widest font-mono mb-2">Tactical Legend</p>
        {['FIRE', 'CRIME', 'MEDICAL', 'FLOOD'].map(t => (
          <div key={t} className="flex items-center gap-2 opacity-80 backdrop-blur-sm">
            {getTypeIcon(t)}
            <span className="text-[9px] font-black uppercase text-white/60 font-mono">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
