import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import { MapContainer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { Shield, MapPin, Camera, User, Phone, Home, CheckCircle, Navigation, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, isValidCoord } from '../lib/utils';
import { OfflineTileLayer } from './OfflineTileLayer';
import { TanodLogo, BackgroundPattern } from './Branding';

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
    if (center && isValidCoord(center[0], center[1])) {
      try {
        if ((map as any)._mapPane) {
          map.setView(center, 18);
        }
      } catch (e) {}
    }
  }, [center, map]);
  
  useEffect(() => {
    let isMounted = true;
    
    const safeInvalidate = () => {
      if (isMounted && map && (map as any)._mapPane) {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) {
        }
      }
    };

    const observer = new window.ResizeObserver(() => {
      safeInvalidate();
    });
    
    const container = map.getContainer();
    observer.observe(container);
    
    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function LocationPicker({ onLocationSelect, initialPos }: { onLocationSelect: (lat: number, lng: number) => void, initialPos: [number, number] }) {
  const [position, setPosition] = useState<[number, number] | null>(initialPos);
  
  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null || !isValidCoord(position[0], position[1]) ? null : (
    <Marker position={position} icon={DefaultIcon} />
  );
}

const SelfieCamera = ({ onCapture }: { onCapture: (dataUrl: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      toast.error("Camera access denied.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCaptured(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (captured) {
    return (
      <div className="relative rounded-3xl overflow-hidden border-2 border-emergency shadow-glow-red aspect-square max-w-[300px] mx-auto">
        <img src={captured} alt="Selfie" className="w-full h-full object-cover" />
        <button 
          onClick={() => { setCaptured(null); startCamera(); }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emergency px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl"
        >
          <RefreshCw className="w-3 h-3" /> Retake
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!stream ? (
        <button 
          type="button"
          onClick={startCamera}
          className="w-full h-64 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all text-white/40 group active:scale-95"
        >
          <Camera className="w-12 h-12 group-hover:text-emergency transition-colors" />
          <span className="font-black uppercase tracking-[0.3em] text-[10px]">Initialize Biometric Scan</span>
        </button>
      ) : (
        <div className="relative rounded-[40px] overflow-hidden border-2 border-info shadow-command animate-in zoom-in duration-300 aspect-square max-w-[300px] mx-auto">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-125 contrast-125" />
          <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20">
            <div className="w-full h-full border border-white/20 rounded-[30px]" />
          </div>
          <button 
            type="button"
            onClick={capture}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full p-1 shadow-2xl active:scale-90 transition-all"
          >
            <div className="w-full h-full border-4 border-emergency rounded-full" />
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default function RegistrationForm({ onCancel, onComplete }: { onCancel: () => void, onComplete: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    address: '',
    gpsLat: 13.0641,
    gpsLng: 120.7303,
    username: '',
    password: '',
    confirmPassword: ''
  });

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await resp.json();
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name
        }));
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setFormData(prev => ({ ...prev, gpsLat: lat, gpsLng: lng }));
          reverseGeocode(lat, lng);
          setDetecting(false);
        },
        (err) => {
          setDetecting(false);
          toast.error('Location detection failed.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfieDataUrl) {
      toast.error('Facial selfie is required.');
      return;
    }
    setLoading(true);
    
    try {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match.');
        setLoading(false);
        return;
      }

      const registrationData = {
        name: formData.fullName,
        email: `${formData.username}@tanod.local`,
        password: formData.password,
        role: 'resident',
        details: {
           phone: formData.mobileNumber,
           address: formData.address,
           gpsLat: formData.gpsLat,
           gpsLng: formData.gpsLng,
           selfieUrl: selfieDataUrl, // Handled as base64 in this refined flow
           status: 'pending'
        }
      };

      await onComplete(registrationData);
      setSuccessId("PENDING_APPROVAL");
      setStep(5);
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error('Registration failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 5) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center text-white relative h-screen overflow-hidden">
        <BackgroundPattern />
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500 relative z-10">
          <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-4 font-mono uppercase italic tracking-tighter shadow-glow-red">REGISTRATION COMPLETE</h2>
          <p className="text-white/40 mb-8 leading-relaxed font-bold uppercase tracking-widest font-mono text-sm px-4">
            IDENTITY SECURED. ACCOUNT UNDER EVALUATION BY BARANGAY COMMAND.
          </p>
          <div className="glass-panel p-8 rounded-3xl mb-8 border border-white/5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2 font-black font-mono">REFERENCE PROTOCOL</p>
            <p className="text-xl font-mono font-black text-white italic tracking-tighter">{successId?.toUpperCase()}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase shadow-glow-red font-mono tracking-widest"
          >
            RETURN TO COMMAND
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white p-6 md:p-12 font-sans overflow-x-hidden relative pb-20">
      <BackgroundPattern />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-6 mb-16">
          <div className="relative">
            <div className="absolute inset-0 bg-emergency/20 blur-xl rounded-full" />
            <TanodLogo size={56} className="relative z-10 drop-shadow-[0_0_10px_rgba(255,75,75,0.5)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase font-mono italic leading-none">Brgy. <span className="text-emergency">Tanod</span> S.O.S</h1>
            <p className="text-white/30 font-black uppercase text-[9px] tracking-[0.4em] mt-2 font-mono">Resident Enrollment Protocol • 5.0.0</p>
          </div>
          <button onClick={onCancel} className="ml-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emergency/20 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-between mb-16 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 z-0"></div>
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center z-10 font-black transition-all duration-500 font-mono italic text-lg",
                step >= i 
                  ? "bg-emergency text-white shadow-glow-red border border-emergency/50 scale-110" 
                  : "bg-brand-card text-white/20 border border-white/5"
              )}
            >
              {i}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-[48px] p-8 md:p-14 shadow-command animate-in slide-in-from-bottom-8 duration-700">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
                <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-info" />
                </div>
                Identity & Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Full Name</label>
                  <input required placeholder="JUAN DELA CRUZ" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Mobile Number</label>
                  <input required type="tel" placeholder="09123456789" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
                </div>
              </div>
              <div className="pt-6">
                <button type="button" onClick={() => setStep(2)} className="w-full md:w-auto px-16 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-[0.3em] shadow-glow-red uppercase font-mono">NEXT PHASE</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
                <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-info" />
                </div>
                Geospatial Binding
              </h2>
              <div className="space-y-6">
                <div className="h-80 rounded-[40px] overflow-hidden border border-white/10 shadow-command relative">
                  <MapContainer 
                    center={[formData.gpsLat, formData.gpsLng]} 
                    zoom={18} 
                    className="w-full h-full grayscale"
                    scrollWheelZoom={false}
                  >
                    <OfflineTileLayer 
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
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
                </div>
                <button 
                    type="button" 
                    onClick={detectLocation} 
                    className={cn(
                      "w-full py-5 rounded-[24px] flex items-center justify-center gap-4 font-black italic uppercase tracking-[0.4em] transition-all font-mono text-xs",
                      detecting ? "bg-info/30" : "bg-info text-white shadow-info/20"
                    )}
                  >
                    {detecting ? 'CALIBRATING GPS...' : 'SYNC PINPOINT LOCATION'}
                  </button>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Exact Address / Landmark</label>
                  <textarea required placeholder="HOUSE NO., STREET, BARANGAY, LANDMARKS" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 min-h-24 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all uppercase" />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs">BACK</button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-5 bg-emergency text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-red uppercase tracking-widest font-mono text-xs italic">NEXT PHASE</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
                <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-info" />
                </div>
                Biometric Selfie
              </h2>
              
              <SelfieCamera onCapture={(dataUrl) => setSelfieDataUrl(dataUrl)} />

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs">BACK</button>
                <button 
                  type="button" 
                  disabled={!selfieDataUrl}
                  onClick={() => setStep(4)} 
                  className="flex-1 py-5 bg-emergency text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-red uppercase tracking-widest font-mono text-xs italic disabled:opacity-50"
                >
                  NEXT PHASE
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-4 text-white">
                <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center">
                  <Home className="w-6 h-6 text-info" />
                </div>
                Security Access
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Guardian Username</label>
                  <input required placeholder="ASSIGN UNIQUE HANDLE" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Access PIN / Password</label>
                  <input type="password" required placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2 font-mono">Verify Access PIN</label>
                  <input type="password" required placeholder="********" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 focus:border-emergency/50 outline-none text-white font-bold font-mono placeholder-white/10 transition-all" />
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-5 border border-white/10 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest font-mono text-xs text-white/60">BACK</button>
                <button type="submit" disabled={loading} className="flex-2 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-glow-red uppercase tracking-[0.2em] font-mono text-sm leading-none">
                  {loading ? 'TRANSMITTING...' : 'AUTHORIZE ENROLLMENT'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
