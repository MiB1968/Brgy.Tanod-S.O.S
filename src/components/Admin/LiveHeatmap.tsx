import React, { useEffect, useState } from 'react';
import ReportMap from '../ReportMap';
import { motion } from 'motion/react';
import { Activity, Flame, ShieldAlert, Waves, MapPin } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface HeatmapPoint {
  id: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export function LiveHeatmap() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const heatmap: any[] = [];
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const alertsSnap = await getDocs(collection(db, 'alerts'));
        
        alertsSnap.forEach(doc => {
          const data = doc.data();
          let ts = 0;
          if (data.created_at) ts = typeof data.created_at === 'string' ? new Date(data.created_at).getTime() : data.created_at.toMillis?.() || data.created_at;
          else if (data.timestamp) ts = typeof data.timestamp === 'string' ? new Date(data.timestamp).getTime() : data.timestamp.toMillis?.() || data.timestamp;
          
          if (ts && Math.abs(ts - Date.now()) < 5 * 365 * 24 * 60 * 60 * 1000) {
            if (ts >= thirtyDaysAgo) {
              let lat, lng;
              if (data.location?.lat) { lat = data.location.lat; lng = data.location.lng; }
              else if (data.lat) { lat = data.lat; lng = data.lng; }
              else if (data.latitude) { lat = data.latitude; lng = data.longitude; }
              
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                heatmap.push({
                  id: doc.id,
                  type: data.type || 'UNKNOWN',
                  lat: parseFloat(lat),
                  lng: parseFloat(lng),
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

  return (
    <div className="relative h-full w-full group">
      <ReportMap lat={points[0]?.lat} lng={points[0]?.lng} />
      
      {/* Overlay Stats */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className="glass-panel px-3 py-2 rounded-xl border-white/5 bg-black/60 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest font-mono">Incident Density</p>
          <p className="text-xl font-black text-white italic font-mono">{points.length} <span className="text-[10px] not-italic text-white/40 font-bold ml-1">REPORTS_30D</span></p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[400] glass-panel p-3 rounded-xl border-white/5 bg-black/60 backdrop-blur-xl space-y-2">
        <p className="text-[8px] font-black uppercase text-white/20 tracking-widest font-mono mb-2">Tactical Legend</p>
        {['FIRE', 'CRIME', 'MEDICAL', 'FLOOD'].map(t => (
          <div key={t} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            {getTypeIcon(t)}
            <span className="text-[9px] font-black uppercase text-white/60 font-mono">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
