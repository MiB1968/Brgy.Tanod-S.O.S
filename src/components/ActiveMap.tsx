import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Alert, PatrolLocation } from '../types';
import React, { useEffect, useState, useCallback } from 'react';
import { downloadRegion, OCCIDENTAL_MINDORO_BOUNDS } from '../lib/mapDownloader';
import { getCachedTile, cacheTile } from '../lib/mapDb';
import { HardDrive, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { OfflineTileLayer } from './OfflineTileLayer';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createSosIcon = (alert: Alert) => {
  const isHighSeverity = alert.aiAnalysis && alert.aiAnalysis.severityScore > 7;
  const color = isHighSeverity ? '#ff1100' : '#FF4B4B';
  const pulseSize = isHighSeverity ? 'w-16 h-16' : 'w-12 h-12';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute ${pulseSize} bg-[${color}]/20 rounded-full animate-ping"></div>
        <div class="absolute w-10 h-10 bg-[${color}]/30 rounded-full animate-pulse"></div>
        <div class="z-10 relative flex items-center justify-center w-10 h-10 bg-[#16191F] rounded-xl border-2 border-[${color}] shadow-[0_0_15px_rgba(255,75,75,0.4)] overflow-hidden">
          <div class="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[size:200%_200%] animate-[shimmer_2s_infinite]"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <div class="absolute -top-1 -right-1 z-20 w-4 h-4 bg-[${color}] rounded-full border-2 border-[#16191F] flex items-center justify-center">
          <span class="text-[8px] font-black text-white">${alert.aiAnalysis?.severityScore || '!'}</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20]
  });
};

const createTanodIcon = (patrol: PatrolLocation) => {
  const isResponding = patrol.status === 'responding';
  const color = isResponding ? '#FF4B4B' : '#34C759';
  const label = isResponding ? 'SOS_RES' : 'PATROL';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 bg-[${color}]/20 rounded-full animate-pulse"></div>
        <div class="z-10 relative flex items-center justify-center w-8 h-8 bg-[#16191F] rounded-full border-2 border-[${color}] shadow-[0_0_10px_${color}4d]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 z-20 px-1 bg-[#16191F] border border-[${color}]/30 rounded text-[6px] font-black uppercase text-[${color}] tracking-tighter">
          ${label}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -15]
  });
};

function ChangeView({ center, zoom }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

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

function MyLocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const locateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 17);
        
        const RedIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        L.marker([latitude, longitude], { icon: RedIcon })
          .addTo(map)
          .bindPopup("<div class='text-black font-black uppercase text-[10px]'>Your Position</div>")
          .openPopup();
          
        setLocating(false);
      },
      (err) => {
        console.error("GPS error", err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <button 
      onClick={(e) => { e.preventDefault(); locateMe(); }}
      className={cn(
        "absolute bottom-4 right-4 z-[400] w-12 h-12 bg-[#16191F] text-xl rounded-full shadow-2xl border border-white/10 flex items-center justify-center hover:bg-emergency hover:scale-110 active:scale-95 transition-all outline-none",
        locating && "animate-pulse"
      )}
      title="Pinpoint My Location"
    >
      {locating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "📍"}
    </button>
  );
}

interface MapProps {
  alerts: Alert[];
  patrols: PatrolLocation[];
  center?: [number, number];
  showHeatmap?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectionLocation?: { lat: number, lng: number } | null;
}

export default function ActiveMap({ 
  alerts, 
  patrols, 
  center: propCenter, 
  showHeatmap = true,
  onLocationSelect,
  selectionLocation
}: MapProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Determine final center: 
  // 1. First active alert
  // 2. Provided prop center
  // 3. Default center
  const [mapCenter, setMapCenter] = useState<[number, number]>(propCenter || [13.2236, 120.5960]); // Mamburao, Occidental Mindoro
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    const hasDownloaded = localStorage.getItem('map_downloaded');
    if (hasDownloaded) {
      setIsDownloaded(true);
    } else {
      // Auto download in background
      handleDownload().then(() => {
        localStorage.setItem('map_downloaded', 'true');
      });
    }
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadRegion(OCCIDENTAL_MINDORO_BOUNDS, [14, 15, 16], (current, total) => {
        setProgress({ current, total });
      });
      setIsDownloaded(true);
      localStorage.setItem('map_downloaded', 'true');
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (alerts.length > 0) {
      const activeAlert = alerts.find(a => a.status === 'pending') || alerts[0];
      setMapCenter([activeAlert.location.lat, activeAlert.location.lng]);
      setZoom(18); // Zoom in closer for emergencies
    } else if (propCenter) {
      setMapCenter(propCenter);
    }
  }, [alerts, propCenter]);

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden relative border border-[#2D3139]">
      <div className="scanline z-[500] pointer-events-none opacity-5" />
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
      >
        <OfflineTileLayer
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={mapCenter} zoom={zoom} />
        
        <MyLocationButton />
        
        {/* Selection Marker */}
        {onLocationSelect && selectionLocation && (
          <Marker 
            position={[selectionLocation.lat, selectionLocation.lng]} 
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                onLocationSelect(position.lat, position.lng);
              },
            }}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 bg-info/30 rounded-full animate-pulse"></div>
                <div class="z-10 text-3xl drop-shadow-lg">📍</div>
                <div class="absolute -bottom-8 bg-[#16191F]/90 text-white text-[8px] font-black px-2 py-1 rounded border border-info/30 whitespace-nowrap uppercase tracking-tighter">DRAG TO TARGET</div>
              </div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup className="dark-popup">
              <div className="p-1">
                <p className="font-bold text-info">Target Location</p>
                <p className="text-[10px]">Drag this pin to the exact emergency site</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Tactical Overlay */}
        <div className="absolute inset-0 pointer-events-none z-[400] opacity-20 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,75,75,0.1)_90deg,rgba(255,75,75,0.3)_180deg,transparent_180deg)] animate-[radar_10s_linear_infinite]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,17,21,0.6)_100%)]"></div>
        </div>
        
        {alerts.filter(a => a.status !== 'resolved' && a.status !== 'cancelled').map(alert => (
          <React.Fragment key={alert.id}>
            {showHeatmap && alert.aiAnalysis && alert.aiAnalysis.severityScore > 6 && (
              <Circle 
                center={[alert.location.lat, alert.location.lng]}
                radius={200 * (alert.aiAnalysis.severityScore / 10)}
                pathOptions={{ 
                  color: '#FF4B4B', 
                  fillColor: '#FF4B4B', 
                  fillOpacity: 0.05,
                  weight: 0,
                  className: "animate-pulse"
                }}
              />
            )}
            <Marker 
              position={[alert.location.lat, alert.location.lng]} 
              icon={createSosIcon(alert)}
            >
              <Popup className="dark-popup">
                <div className="p-3 min-w-[200px] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex flex-col">
                      <p className="font-black text-[#FF4B4B] uppercase text-xs tracking-tighter m-0 leading-tight">CRITICAL SOS</p>
                      <p className="font-bold text-white text-sm m-0 leading-tight">{alert.residentName}</p>
                    </div>
                    <div className="bg-[#FF4B4B]/10 border border-[#FF4B4B]/30 px-2 py-1 rounded">
                       <span className="text-[10px] font-black text-[#FF4B4B]">SV: {alert.aiAnalysis?.severityScore || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-info" />
                      <span className="text-[10px] font-mono font-bold uppercase text-white/60 tracking-wider">Type: {alert.type}</span>
                    </div>
                    
                    {alert.aiAnalysis?.summary && (
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        <p className="text-[10px] text-white/80 leading-relaxed font-medium italic">
                          "{alert.aiAnalysis.summary.length > 80 ? alert.aiAnalysis.summary.substring(0, 80) + '...' : alert.aiAnalysis.summary}"
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/30 uppercase font-black">Status</span>
                        <span className="text-[10px] text-info font-bold uppercase">{alert.status}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/30 uppercase font-black">Accuracy</span>
                        <span className="text-[10px] text-white/70 font-mono">±{Math.round(alert.location.accuracy || 0)}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            {alert.location.accuracy && (
              <Circle 
                center={[alert.location.lat, alert.location.lng]}
                radius={alert.location.accuracy}
                pathOptions={{ 
                  color: '#FF4B4B', 
                  fillColor: '#FF4B4B', 
                  fillOpacity: 0.1,
                  weight: 1
                }}
              />
            )}
          </React.Fragment>
        ))}

        {patrols.filter(p => p.isActive).map(patrol => (
          <React.Fragment key={patrol.id}>
            <Marker 
              position={[patrol.location.lat, patrol.location.lng]} 
              icon={createTanodIcon(patrol)}
            >
              <Popup className="dark-popup">
                <div className="p-3 min-w-[180px] space-y-3">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        <span className="text-[10px] font-black text-white/40">{patrol.tanodName.charAt(0)}</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-[#16191F] animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <p className="font-black text-white uppercase text-xs tracking-tighter m-0 leading-tight">{patrol.tanodName}</p>
                      <p className="text-[8px] font-mono text-white/40 m-0 uppercase tracking-widest">Patrol Officer</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/30 uppercase font-black">Tactical ID</span>
                      <span className="font-mono text-white/70">{patrol.tanodId?.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/30 uppercase font-black">Status</span>
                      <span className={cn(
                        "font-bold uppercase tracking-wider",
                        patrol.status === 'responding' ? "text-emergency animate-pulse" : "text-success"
                      )}>
                        {patrol.status === 'responding' ? 'RESPONDING!!' : 'ACTIVE_ON_PATROL'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/30 uppercase font-black">Signal</span>
                      <span className="text-white/70 font-mono">STABLE | ±{Math.round(patrol.location.accuracy || 0)}m</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 opacity-40">
                         <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                         <span className="text-[8px] font-mono uppercase">Last Sync: {new Date(patrol.lastUpdate || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            {patrol.location.accuracy && (
              <Circle 
                center={[patrol.location.lat, patrol.location.lng]}
                radius={patrol.location.accuracy}
                pathOptions={{ 
                  color: '#4CAF50', 
                  fillColor: '#4CAF50', 
                  fillOpacity: 0.1,
                  weight: 1
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Offline Download Controls */}
      <div className="absolute top-4 right-4 z-[400]">
        {!isDownloaded ? (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-[#16191F]/90 backdrop-blur-md border border-[#2D3139] rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:border-[#FF4B4B] transition-all",
              downloading && "cursor-not-allowed opacity-80"
            )}
          >
            {downloading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                DOWNLOADING {Math.round((progress.current / progress.total) * 100)}%
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-[#FF4B4B]" />
                OFFLINE MAP (OCC. MINDORO)
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#16191F]/90 backdrop-blur-md border border-green-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-green-500">
            <CheckCircle2 className="w-3 h-3" />
            MAP READY OFFLINE
          </div>
        )}
      </div>

      <style>{`
        .leaflet-container {
          background: #0F1115 !important;
        }
        .dark-popup .leaflet-popup-content-wrapper,
        .dark-popup .leaflet-popup-tip {
          background: #16191F !important;
          color: white !important;
          border: 1px solid #2D3139;
        }
        .dark-popup .leaflet-popup-content p {
          margin: 0 !important;
        }
        @keyframes shimmer {
          0% { background-position: -200% -200%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes radar {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .grayscale { filter: grayscale(100%); }
        .invert { filter: invert(100%); }
        .brightness-90 { filter: brightness(90%); }
        .contrast-90 { filter: contrast(90%); }
      `}</style>
    </div>
  );
}
