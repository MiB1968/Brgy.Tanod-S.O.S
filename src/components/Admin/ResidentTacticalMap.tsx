
import { useState, useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ResidentProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Filter, MapPin, Phone, User, Calendar, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn, isValidCoord } from '../../lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CENTER: [number, number] = [13.2236, 120.596];

const ResidentIcon = L.divIcon({
  className: 'custom-resident-marker',
  html: `
    <div class="w-8 h-8 rounded-full bg-[#0D0D12] border-2 border-[#3B82F6] flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
       <div class="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export default function ResidentTacticalMap() {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [ageFilter, setAgeFilter] = useState<'all' | 'child' | 'youth' | 'adult' | 'senior'>('all');
  const [specialNeedsFilter, setSpecialNeedsFilter] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    if (!db) return;
    // Only approved residents for the tactical map
    const q = query(collection(db, 'residents'), where('status', '==', 'approved'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResidentProfile));
      // Filter out those without valid coordinates
      const validData = data.filter(r => isValidCoord(r.gpsLat, r.gpsLng));
      setResidents(validData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredResidents = residents.filter(r => {
    // Age filter logic
    if (ageFilter !== 'all') {
      if (ageFilter === 'child' && r.age >= 13) return false;
      if (ageFilter === 'youth' && (r.age < 13 || r.age > 24)) return false;
      if (ageFilter === 'adult' && (r.age < 25 || r.age > 59)) return false;
      if (ageFilter === 'senior' && r.age < 60) return false;
    }

    // Special needs filter
    if (specialNeedsFilter !== 'all') {
      if (specialNeedsFilter === 'yes' && r.specialNeeds !== 'Yes') return false;
      if (specialNeedsFilter === 'no' && r.specialNeeds !== 'No') return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glass-panel p-8 rounded-[40px] border-white/5 relative overflow-hidden">
        <div className="scanline opacity-10" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white font-mono flex items-center gap-4 outline-text">
            <Users className="w-8 h-8 text-info shadow-glow-blue" />
            Resident Intelligence Map
          </h2>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mt-2">Geospatial Distribution of Approved Community Members</p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
            {/* Age Filter */}
            <div className="flex items-center gap-3 bg-brand-bg/50 border border-white/10 rounded-[20px] px-4 py-2">
                <Filter className="w-4 h-4 text-white/20" />
                <select 
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value as any)}
                    className="bg-transparent border-none text-[10px] font-black text-white/60 font-mono outline-none uppercase tracking-widest cursor-pointer"
                >
                    <option value="all">Age: Total Precinct</option>
                    <option value="child">Age: Children (&lt;13)</option>
                    <option value="youth">Age: Youth (13-24)</option>
                    <option value="adult">Age: Adults (25-59)</option>
                    <option value="senior">Age: Seniors (60+)</option>
                </select>
            </div>

            {/* Special Needs Filter */}
            <div className="flex items-center gap-3 bg-brand-bg/50 border border-white/10 rounded-[20px] px-4 py-2">
                <ShieldCheck className="w-4 h-4 text-white/20" />
                <select 
                    value={specialNeedsFilter}
                    onChange={(e) => setSpecialNeedsFilter(e.target.value as any)}
                    className="bg-transparent border-none text-[10px] font-black text-white/60 font-mono outline-none uppercase tracking-widest cursor-pointer"
                >
                    <option value="all">Needs: Any Status</option>
                    <option value="yes">Needs: Assisted Only</option>
                    <option value="no">Needs: standard</option>
                </select>
            </div>

            <div className="flex items-center px-6 py-2 bg-success/10 border border-success/20 rounded-[20px]">
                <span className="text-[10px] font-black text-success uppercase font-mono tracking-widest">
                    Units Tracked: {filteredResidents.length}
                </span>
            </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 rounded-[48px] overflow-hidden border-4 border-white/5 relative group bg-brand-bg shadow-command">
        <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-brand-bg/10 rounded-[44px]" />
        
        {loading ? (
             <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-bg/50 backdrop-blur-md">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-info border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-white/40 uppercase font-mono tracking-[0.4em] animate-pulse">Syncing Tactical Grid...</p>
                </div>
             </div>
        ) : (
            <MapContainer 
                center={CENTER} 
                zoom={14} 
                className="w-full h-full grayscale-[0.8] contrast-[1.2] invert-[0.9] hue-rotate-[180deg]"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                {filteredResidents.map((resident) => (
                    <Marker 
                        key={resident.id} 
                        position={[resident.gpsLat, resident.gpsLng]}
                        icon={ResidentIcon}
                    >
                        <Popup className="tactical-popup">
                            <div className="p-4 bg-[#0D0D12] text-white font-mono min-w-[240px] rounded-2xl border-2 border-white/10 shadow-2xl">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center">
                                       <User className="w-6 h-6 text-info" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase italic tracking-tighter text-white">
                                            {resident.fullName}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded border border-white/10">ID: {resident.idNumber}</span>
                                            <span className={cn(
                                                "text-[8px] px-1.5 py-0.5 rounded border font-black uppercase",
                                                resident.specialNeeds === 'Yes' ? "bg-emergency/10 text-emergency border-emergency/20" : "bg-success/10 text-success border-success/20"
                                            )}>
                                                {resident.specialNeeds === 'Yes' ? 'PRIORITY_CARE' : 'STANDARD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                        <Phone className="w-3.5 h-3.5 text-info group-hover:scale-110 transition-transform" />
                                        <div>
                                            <p className="text-[7px] text-white/30 uppercase font-bold tracking-widest leading-none mb-1">Tactical Comms</p>
                                            <p className="text-[11px] font-black">{resident.mobileNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                        <Calendar className="w-3.5 h-3.5 text-success" />
                                        <div>
                                            <p className="text-[7px] text-white/30 uppercase font-bold tracking-widest leading-none mb-1">Vital Statistics</p>
                                            <p className="text-[11px] font-black">{resident.age} YRS • {resident.gender}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                        <MapPin className="w-3.5 h-3.5 text-emergency" />
                                        <div>
                                            <p className="text-[7px] text-white/30 uppercase font-bold tracking-widest leading-none mb-1">Registered AO</p>
                                            <p className="text-[11px] font-black truncate max-w-[150px]">{resident.houseNumber} {resident.street}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    className="w-full mt-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-info transition-all flex items-center justify-center gap-2"
                                    onClick={() => window.open(`https://www.google.com/maps?q=${resident.gpsLat},${resident.gpsLng}`, '_blank')}
                                >
                                    <ExternalLink className="w-3 h-3" /> Execute Route Extraction
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        )}
      </div>

      <style>{`
        .tactical-popup .leaflet-popup-content-wrapper {
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
        }
        .tactical-popup .leaflet-popup-tip {
            background: #0D0D12 !important;
            border: 2px solid rgba(255,255,255,0.1) !important;
        }
        .tactical-popup .leaflet-popup-content {
            margin: 0 !important;
        }
      `}</style>
    </div>
  );
}
