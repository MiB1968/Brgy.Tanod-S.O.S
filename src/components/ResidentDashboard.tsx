import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../lib/api';
import { User, Alert, PatrolLocation, EmergencyType, SystemBroadcast } from '../types';
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  Map as MapIcon, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Info, 
  Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import TacticalCard from './TacticalCard';
import ActiveMap from './ActiveMap';
import { useShoutDetection } from '../hooks/useShoutDetection';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { analyzeIncident } from '../services/aiService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useSystemStore } from '../store/useSystemStore';
import { useSOSStore } from '../store/useSOSStore';
import { useIncidentStore } from '../store/useIncidentStore';
import { getQueueSize, removeQueuedSOS } from '../lib/offlineQueue';
import { TanodLogo } from './Branding';
import { toast } from 'react-hot-toast';
import AnimatedButton from './AnimatedButton';
import AboutModal from './AboutModal';
import FlameAnimation from './FlameAnimation';
import { BrgyTanodQR } from './BrgyTanodQR';
import { InstallAppButton } from './InstallAppButton';
import { CitizenReportTracker } from './CitizenReportTracker';
import { SOSChat } from './SOSChat';

const SOS_SUGGESTIONS: Record<string, string[]> = {
  'crime': ['Disturbance', 'Theft', 'Attempted Entry', 'Vandalism', 'Suspicious Activity'],
  'fire': ['Smoke Seen', 'Structural Fire', 'Grass/Brush Fire', 'Electrical Fire', 'Chemical Smell'],
  'medical': ['Unresponsive', 'Fall/Injury', 'Difficulty Breathing', 'Seizure'],
  'flood': ['Rising Water', 'Flash Flood', 'Blocked Drainage', 'Home Inundation'],
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ResidentDashboard({ profile, patrols, visiblePatrols, isOnline, deferredPrompt, onInstall, onTabChange, sirenActive, onToggleSiren }: { profile: User, patrols: PatrolLocation[], visiblePatrols: PatrolLocation[], isOnline: boolean, deferredPrompt: any, onInstall: () => void, onTabChange: (tab: string) => void, sirenActive: boolean, onToggleSiren: () => void }) {
  const { queuedSOSCount, setQueuedSOSCount, triggerSync, setIsOnline } = useSystemStore();
  const { activeAlert, isSending, createSOS, subscribeToUserAlerts } = useSOSStore();
  const [sosTypeToSubmit, setSosTypeToSubmit] = useState<EmergencyType | null>(null);
  const [isChoosingCategory, setIsChoosingCategory] = useState(false);
  const [sosDescription, setSosDescription] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [manualLocation, setManualLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number, accuracy?: number } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      const unsubscribe = subscribeToUserAlerts(profile.id);
      return () => unsubscribe();
    }
  }, [profile?.id, subscribeToUserAlerts]);

  useEffect(() => {
    const checkQueue = async () => {
      const size = await getQueueSize();
      setQueuedSOSCount(size);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    // Sync logic handled by stores
  }, [profile.id]);

  const activeAlertIdRef = useRef<string | null>(null);
  const pendingChunksRef = useRef<Blob[]>([]);
  const [guardianMode, setGuardianMode] = useState(false);

  const handleSOSRef = useRef<((type?: EmergencyType, description?: string) => Promise<void>) | null>(null);

  const handleShout = useCallback(() => {
    toast.error('SHOUT DETECTED: AUTO-INITIATING SOS', {
      duration: 5000,
      icon: '🔊'
    });
    if (handleSOSRef.current) {
      handleSOSRef.current('other', 'Dynamic AI Alert: High-decibel sound/shout detected.');
    }
  }, []);

  const { isListening, startListening, stopListening } = useShoutDetection(handleShout);

  const handleVideoChunk = useCallback((chunk: Blob) => {
    if (!activeAlertIdRef.current) {
      pendingChunksRef.current.push(chunk);
      return;
    }
    
    // If we have an ID, upload current chunk AND any pending ones
    const upload = async (blob: Blob, timestamp: number) => {
      const service = await import('../services/StorageService');
      await service.uploadVideoChunk(activeAlertIdRef.current!, blob, timestamp);
    };

    if (pendingChunksRef.current.length > 0) {
      const chunks = [...pendingChunksRef.current];
      pendingChunksRef.current = [];
      chunks.forEach((c, idx) => upload(c, Date.now() - (chunks.length - idx) * 1000));
    }
    
    upload(chunk, Date.now());
  }, []);

  const { isRecording, startRecording, stopRecording } = useVideoRecorder(handleVideoChunk);
  
  useEffect(() => {
    if (guardianMode) {
      startListening();
    } else {
      stopListening();
    }
  }, [guardianMode, startListening, stopListening]);

  useEffect(() => {
    if (!activeAlert && isRecording) {
      stopRecording();
      activeAlertIdRef.current = null;
      pendingChunksRef.current = [];
    }
  }, [activeAlert, isRecording, stopRecording]);


  const handleSOS = async (type: EmergencyType = 'other', description: string) => {
    if (activeAlert || isSending) return;
    
    try {
      let location = manualLocation;
      
      if (!location) {
        try {
          const gpsPos = await new Promise<GeolocationPosition>((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej, { 
              enableHighAccuracy: true, 
              timeout: 5000 
            })
          );
          location = { 
            lat: gpsPos.coords.latitude, 
            lng: gpsPos.coords.longitude
          };
        } catch {
          location = { lat: 13.2236, lng: 120.5960 }; // Fallback
        }
      }

      // Start recording immediately to capture initial moments
      await startRecording();
      
      const alertId = await createSOS(type, description, location);
      activeAlertIdRef.current = alertId;

      setSosSuccess(true);
      setTimeout(() => {
        setSosSuccess(false);
        setSosTypeToSubmit(null);
        setSosDescription('');
        setManualLocation(null);
      }, 1500);

      toast.success('SOS Protocol Initiated. Units alerted.');
    } catch (err: any) {
      toast.error('Emergency transmission failed. Call hotlines.');
    }
  };

  handleSOSRef.current = handleSOS;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-32 relative tactical-grid min-h-screen p-4 md:p-8"
    >
      <div className="scanline opacity-10 pointer-events-none" />
      {deferredPrompt && (
        <motion.button
          variants={itemVariants}
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-[32px] bg-info/10 text-info font-black border border-info/30 hover:bg-info/20 mb-8 transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-[0.2em] font-mono shadow-[0_0_20px_rgba(59,130,246,0.2)] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-info/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <span className="text-lg group-hover:rotate-12 transition-transform">📲</span>
          <span className="relative z-10">INSTALL BRGY. S.O.S. MOBILE</span>
        </motion.button>
      )}
      <AnimatePresence mode="popLayout">
        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="glass-panel border-emergency/50 rounded-[48px] p-8 shadow-glow-red overflow-hidden relative skew-card"
          >
            <div className="absolute inset-0 emergency-bg-glow opacity-20 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emergency/20 overflow-hidden">
               <motion.div 
                 animate={{ x: ['-100%', '100%'] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                 className="w-1/2 h-full bg-emergency shadow-glow-red"
               />
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-emergency rounded-[28px] flex items-center justify-center relative sos-glow">
                  <TanodLogo size={56} animated={false} className="z-10" />
                  <div className="absolute inset-0 bg-emergency rounded-[28px] blur-2xl opacity-40 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-2xl font-black italic tracking-tighter text-white uppercase font-mono leading-tight">Emergency Incident Live</h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] bg-emergency px-2 py-0.5 rounded-full font-black tracking-widest uppercase">ACTIVE SOS</span>
                    {isRecording && (
                      <span className="flex items-center gap-1.5 ml-2 text-[9px] text-white/80 font-black tracking-tighter bg-black/40 px-2 py-0.5 rounded-full ring-1 ring-white/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ff0000]" />
                        EVIDENCE_STREAMING_ACTIVE
                      </span>
                    )}
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] font-mono">
                      {activeAlert.type} • T+{Math.floor((Date.now() - new Date(activeAlert.timestamp).getTime()) / 60000)}m reported
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 max-w-lg w-full">
                <div className="relative h-3 bg-brand-bg rounded-full overflow-hidden mb-3 border border-white/5">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: activeAlert.status === 'pending' ? '33.33%' : 
                             activeAlert.status === 'responding' ? '66.66%' : '100%' 
                    }}
                    className="absolute top-0 left-0 h-full bg-emergency shadow-[0_0_15px_rgba(255,59,48,0.5)]"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em] font-mono">
                  <span className={activeAlert.status === 'pending' ? 'text-emergency' : 'text-white/20'}>[Alert Sent]</span>
                  <span className={activeAlert.status === 'responding' ? 'text-emergency' : 'text-white/20'}>[Unit En Route]</span>
                  <span className={activeAlert.status === 'resolved' ? 'text-success' : 'text-white/20'}>[Resolved]</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCancellingId(activeAlert.id)}
                  className="px-8 py-4 bg-brand-bg border border-white/10 text-white/60 text-xs font-black rounded-2xl hover:text-white hover:border-emergency/50 transition-all uppercase tracking-widest active:scale-95 group"
                >
                  <span className="group-hover:text-emergency transition-colors">Abort SOS Protocol</span>
                </button>
              </div>
            </div>

            {/* Tactical Chat Section */}
            <div className="mt-8 border-t border-white/5 pt-8">
              <SOSChat alertId={activeAlert.id} currentUser={profile} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeAlert && (
        <div className="space-y-6">
          {queuedSOSCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em] font-mono leading-none mb-1">Queue Active</p>
                  <p className="text-[11px] font-bold text-white/60 font-mono tracking-tight">{queuedSOSCount} SOS request{queuedSOSCount > 1 ? 's' : ''} pending sync</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest font-mono">
                  {isOnline ? 'Syncing...' : 'Waiting for Data'}
                </div>
                {isOnline && (
                  <button 
                    onClick={triggerSync}
                    className="bg-amber-500 text-black text-[9px] font-black px-3 py-2 rounded-xl active:scale-95 transition-all shadow-lg shadow-amber-500/20 uppercase tracking-widest"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <motion.div 
            variants={itemVariants}
            className="relative max-w-2xl mx-auto"
          >
          <div className="absolute -inset-4 border border-white/5 rounded-[64px] pointer-events-none opacity-50" />
          <div className="absolute -inset-2 border border-white/10 rounded-[56px] pointer-events-none opacity-20" />
          
            <div className="glass-panel border-white/10 rounded-[56px] p-10 md:p-20 relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)] skew-card">
              <div className="absolute inset-0 tactical-grid opacity-10" />
              <div className="scanline opacity-20 pointer-events-none" />
              <div className="absolute inset-0 emergency-bg-glow opacity-5" />
              
              <div className="absolute top-6 left-6 md:top-10 md:left-10 flex flex-col gap-4 z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" />
                    <span className="text-[8px] font-mono font-black text-white/20 uppercase tracking-[0.4em]">Auth Layer 1</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em] italic">Resident SOS Protocol</span>
                </div>
                
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 w-fit backdrop-blur-md shadow-2xl">
                   <div className="flex flex-col min-w-[50px]">
                      <span className="text-[6px] font-black tracking-[0.2em] text-white/30 uppercase leading-none mb-1">Guardian AI</span>
                      <span className={cn("text-[9px] font-black leading-none tracking-tight", guardianMode ? 'text-emergency' : 'text-white/40')}>
                        {guardianMode ? 'LISTENING' : 'OFF'}
                      </span>
                   </div>
                   <button 
                    onClick={() => {
                        const next = !guardianMode;
                        setGuardianMode(next);
                        toast(next ? 'Guardian AI Activated' : 'Guardian AI Disabled', { 
                          icon: next ? '🛡️' : '🔘',
                          style: { background: '#16191F', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                        });
                    }}
                    className={cn(
                      "w-8 h-4 rounded-full p-0.5 transition-all duration-500 relative",
                      guardianMode ? 'bg-emergency' : 'bg-white/10'
                    )}
                   >
                      <div className={cn(
                        "w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-md",
                        guardianMode ? 'translate-x-3.5' : 'translate-x-0'
                      )} />
                   </button>
                </div>
              </div>

              <div className="absolute top-8 right-8 text-right opacity-20 group-hover:opacity-60 transition-opacity z-10">
                <Shield size={16} className="text-white ml-auto mb-1" />
                <span className="text-[7px] font-mono font-black text-white uppercase tracking-tighter">SECURED_LINK</span>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center mt-24 md:mt-36">
                <h2 className="text-4xl md:text-8xl font-black tracking-tighter mb-4 italic text-white uppercase font-mono leading-none outline-text">
                  COMMAND <span className="text-emergency">STATUS</span>
                </h2>

              <div className="flex items-center gap-2 mb-12">
                <span className="h-[1px] w-8 bg-white/20" />
                <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] font-mono">Standby / Network Ready</p>
                <span className="h-[1px] w-8 bg-white/20" />
              </div>
              
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                    className="absolute inset-0 -m-12 border border-emergency/10 rounded-full opacity-20" 
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                    className="absolute inset-0 -m-6 border border-emergency/30 rounded-full opacity-30" 
                  />
                  
                  <motion.button 
                    disabled={isSending}
                    onClick={() => setIsChoosingCategory(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    animate={{ 
                      boxShadow: !isSending ? [
                        "0 0 20px rgba(239,68,68,0.2)",
                        "0 0 60px rgba(239,68,68,0.5)",
                        "0 0 20px rgba(239,68,68,0.2)"
                      ] : "0 0 80px rgba(255,255,255,0.6)"
                    }}
                    transition={{ 
                      boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                      scale: { duration: 0.2 }
                    }}
                    className={cn(
                      "relative w-72 h-72 md:w-96 md:h-96 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-700 group z-10 overflow-hidden border-8",
                      isSending 
                        ? "bg-emergency scale-95 border-white" 
                        : "bg-emergency/10 border-emergency/40 hover:bg-emergency hover:border-white"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                      <TanodLogo 
                        size={180} 
                        animated={!isSending} 
                        className={cn(
                          "transition-all duration-500",
                          !isSending ? "text-emergency group-hover:text-white" : "text-white"
                        )} 
                      />
                    </div>
                    
                    <div className="z-10 flex flex-col items-center gap-1 mt-4">
                      <span className={cn(
                        "text-3xl md:text-5xl font-black italic tracking-tighter uppercase font-mono transition-colors",
                        isSending ? "text-white" : "text-white group-hover:text-white"
                      )}>
                        {isSending ? 'COMM_SYNC...' : 'INITIATE_SOS'}
                      </span>
                      <span className="text-[10px] font-black font-mono text-white/30 uppercase tracking-[0.2em] group-hover:text-white/60 text-center px-8 leading-tight">DEPLOY_RESIDENTIAL_SIGNAL <br/>TO BRGY_NETWORK</span>
                    </div>

                    {!isSending && (
                      <div className="absolute inset-0 rounded-full border-4 border-emergency/20 animate-[ping_3s_infinite] opacity-50" />
                    )}
                  </motion.button>
                </div>

              <div className="mt-16 flex flex-col items-center gap-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-6 h-1 rounded-full bg-emergency/20 overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                        className="h-full w-full bg-emergency"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-white/20 text-[8px] font-mono font-black uppercase tracking-[0.3em]">Neural Sync Active • Cluster: Mamburao_Main</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}

      <motion.div variants={itemVariants} className="bg-[#16191F] border border-[#2D3139] rounded-[32px] md:rounded-[40px] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-white uppercase italic tracking-tighter">
            <MapIcon className="w-5 h-5 text-[#FF4B4B]" /> LIVE PATROL STATUS
          </h3>
          <div className="flex items-center gap-4 text-xs font-black tracking-widest text-[#8E9299]">
            <div className="flex items-center gap-2"><span className="text-base">🔴</span> RESIDENT SOS</div>
            <div className="flex items-center gap-2"><span className="text-base">🟢</span> TANOD ON DUTY</div>
          </div>
        </div>
        <div className="h-64 rounded-[30px] overflow-hidden border border-[#2D3139]">
          <ActiveMap alerts={activeAlert ? [activeAlert] : []} patrols={visiblePatrols} />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#8E9299] text-xs">There are {patrols.length} Tanod units currently patrolling the Barangay.</p>
          <button 
            onClick={() => onTabChange('tracker')}
            className="px-6 py-2 bg-brand-card border border-white/5 text-info text-[10px] font-black rounded-xl hover:border-info/40 transition-all uppercase tracking-widest font-mono"
          >
            🛰️ Tactical GPS Tracker
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-xl text-white uppercase italic tracking-tighter font-mono">Tactical Comms</h3>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] font-mono">External Hotlines</span>
            <button 
              onClick={onToggleSiren}
              className={cn(
                "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-widest group",
                sirenActive 
                  ? "bg-emergency border-white text-white animate-pulse shadow-glow-red" 
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60"
              )}
              title={sirenActive ? "Stop Global Siren" : "Test Global Siren"}
            >
              {sirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {sirenActive ? "STOP SIREN" : "TEST SIREN"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Police (PNP)', number: '117', color: 'bg-info', icon: '🚨', glow: 'rgba(56, 189, 248, 0.3)' },
            { name: 'Fire (BFP)', number: '911', color: 'bg-caution', icon: '🔥', glow: 'rgba(251, 191, 36, 0.3)' },
            { name: 'Medical', number: '0917-SOS', color: 'bg-emergency', icon: '🚑', glow: 'rgba(255, 59, 48, 0.3)' },
            { name: 'Brgy. Hall', number: '123-4567', color: 'bg-success', icon: '🏢', glow: 'rgba(34, 197, 94, 0.3)' },
          ].map(c => (
            <TacticalCard
              key={c.name}
              onClick={() => window.location.href = `tel:${c.number}`}
              glowColor={c.glow}
              className="p-1"
            >
              <div className="flex flex-col items-center gap-3 p-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-xl text-2xl relative", c.color)}>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
                  <span className="z-10">{c.icon}</span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1 font-mono">{c.name}</p>
                  <p className="text-base font-black text-white italic tracking-tighter font-mono">{c.number}</p>
                </div>
              </div>
            </TacticalCard>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="pb-8">
        <RecentAlerts residentId={profile.id} />
      </motion.div>

      <motion.div variants={itemVariants} className="pb-16 border-t border-white/5 pt-12">
        <CitizenReportTracker userId={profile.id} />
      </motion.div>

      <motion.div variants={itemVariants} className="mb-16">
        <BrgyTanodQR />
      </motion.div>

      <motion.div variants={itemVariants}>
        <InstallAppButton />
      </motion.div>

      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
        role={profile.role} 
      />

      <motion.div variants={itemVariants} className="flex justify-center pt-8 border-t border-[#2D3139]">
        <button 
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-2 text-[#8E9299] hover:text-white transition-colors group px-4 py-2"
          id="resident-about-btn"
        >
          <Info className="w-4 h-4 text-[#8E9299]/40 group-hover:text-white transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">System Vision & Mission</span>
        </button>
      </motion.div>

      {/* SOS Category Modal */}
      <AnimatePresence>
        {isChoosingCategory && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-start justify-center p-4 pt-16">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-[#16191F] border border-white/10 w-full max-w-lg rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col p-8 relative"
            >
              <div className="scanline" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emergency/20 blur-3xl" />
              
              <h3 className="font-black italic text-2xl md:text-3xl tracking-tighter text-white mb-2 uppercase text-center font-mono">Select Protocol</h3>
              <p className="text-white/40 text-xs font-bold mb-8 text-center uppercase tracking-[0.2em] font-mono">Mission-critical category required</p>
              
               <div className="grid grid-cols-2 gap-4 mb-8">
                {(['medical', 'fire', 'crime', 'flood'] as EmergencyType[]).map(type => {
                  const getIcon = (t: string) => {
                    switch(t) {
                      case 'medical': return '🏥';
                      case 'fire': return '🔥';
                      case 'crime': return '🚨';
                      case 'flood': return '🌊';
                      default: return '⚠️';
                    }
                  };
                  return (
                    <TacticalCard
                      key={type}
                      onClick={() => { setIsChoosingCategory(false); setSosTypeToSubmit(type); }}
                      glowColor="rgba(255, 59, 48, 0.3)"
                      className="p-1"
                    >
                      <div className="p-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-brand-card rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emergency group-hover:shadow-glow-red transition-all text-3xl">
                          <span className="group-hover:scale-110 transition-transform">{getIcon(type)}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] group-hover:text-white font-mono">{type}</p>
                      </div>
                    </TacticalCard>
                  );
                })}
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsChoosingCategory(false)}
                  className="flex-1 py-5 bg-brand-card border border-white/5 text-white/60 font-black rounded-2xl hover:text-white hover:bg-brand-bg transition-all text-[10px] uppercase italic tracking-[0.2em] font-mono shadow-md active:scale-95"
                >
                  ABORT REQUEST
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SOS Description Modal */}
      <AnimatePresence>
        {sosTypeToSubmit && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-start justify-center p-4 pt-16">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-[#16191F] border border-white/10 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col p-6 md:p-8 relative"
            >
              <div className="absolute inset-0 pointer-events-none opacity-10 flex items-end justify-center">
                <FlameAnimation size="lg" className="w-[80%] h-[60%]" />
              </div>
              <div className="scanline" />
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-info/20 blur-3xl" />
              
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="font-black italic text-2xl tracking-tighter text-white mb-2 uppercase font-mono">Situation Intel</h3>
                    <p className="text-white/40 text-[10px] font-black mb-4 uppercase tracking-[0.2em] font-mono leading-relaxed">Provide critical context for arriving Tanod units.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SOS_SUGGESTIONS[sosTypeToSubmit as string]?.map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setSosDescription(prev => prev ? `${prev}, ${suggestion}` : suggestion)}
                        className="px-3 py-1 bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-emergency/20 hover:text-white transition-all border border-white/5"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  
                  <textarea 
                    value={sosDescription}
                    onChange={(e) => setSosDescription(e.target.value)}
                    placeholder="DETAILS: Location, nature, casualties..."
                    className="w-full bg-brand-bg border border-white/5 rounded-3xl p-6 text-white placeholder:text-white/20 focus:outline-none focus:border-emergency min-h-[120px] font-mono text-sm leading-relaxed shadow-inner"
                  />

                  <div className="flex items-center justify-between p-4 bg-brand-bg/50 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", manualLocation ? "bg-info/20 text-info" : "bg-white/5 text-white/20")}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/60 font-mono">Location Mode</p>
                        <p className="text-[9px] font-bold text-white/30 truncate max-w-[120px]">
                          {manualLocation ? 'MANUAL OVERRIDE' : 'LIVE GPS SYNC'}
                        </p>
                      </div>
                    </div>
                    {manualLocation && (
                      <button 
                        onClick={() => setManualLocation(null)}
                        className="text-[8px] font-black text-emergency border border-emergency/20 px-2 py-1 rounded hover:bg-emergency/10"
                      >
                        RESET TO GPS
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-[300px] flex flex-col gap-2">
                   <p className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-2">Tactical Map Override</p>
                   <div className="flex-1 bg-brand-bg/50 rounded-3xl border border-white/5 overflow-hidden">
                      <ActiveMap 
                        alerts={[]} 
                        patrols={visiblePatrols} 
                        center={manualLocation ? [manualLocation.lat, manualLocation.lng] : gpsLocation ? [gpsLocation.lat, gpsLocation.lng] : undefined}
                        onLocationSelect={(lat, lng) => setManualLocation({ lat, lng })}
                        selectionLocation={manualLocation || gpsLocation}
                      />
                   </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => { setSosTypeToSubmit(null); setSosDescription(''); setManualLocation(null); }}
                  className="flex-1 py-5 bg-brand-card border border-white/5 text-white/50 font-black rounded-2xl hover:text-white transition-all text-[10px] uppercase tracking-widest font-mono italic active:scale-95"
                >
                  Cancel
                </button>
                <AnimatedButton 
                  isLoading={isSending}
                  isSuccess={sosSuccess}
                  onClick={() => handleSOS(sosTypeToSubmit, sosDescription)}
                  label="Transmit Alert"
                  successLabel="Alert Transmitted"
                  className="flex-[2]"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancellingId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16191F] border border-[#2D3139] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-6"
            >
              <h3 className="font-black italic text-xl md:text-2xl tracking-tighter text-white mb-6 uppercase text-center">Cancel Alert?</h3>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCancellingId(null)}
                  className="flex-1 py-3 bg-[#252932] text-white font-bold rounded-xl hover:bg-[#2D3139] transition-all text-sm uppercase"
                >
                  No, Keep SOS
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await removeQueuedSOS(cancellingId);
                      await api.alerts.update(cancellingId, { status: 'cancelled' });
                    } catch (error: any) {
                      useIncidentStore.getState().updateAlertStatus(cancellingId, 'cancelled');
                      console.warn('Failed to update cancel status online, cancelled locally:', error);
                    } finally {
                      setCancellingId(null);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all text-sm uppercase"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RecentAlerts({ residentId }: { residentId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await api.generic.list(`alerts?residentId=${residentId}&limit=5&orderBy=timestamp:desc`);
        setAlerts(data);
      } catch (err) {
        console.error("Failed to fetch recent alerts", err);
      }
    };
    fetchAlerts();
  }, [residentId]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="font-black text-xl text-white uppercase italic tracking-tighter font-mono flex items-center gap-3">
         <Clock className="w-5 h-5 text-emergency" /> My SOS History
      </h3>
      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-[#16191F] border border-[#2D3139] p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#252932] rounded-xl flex items-center justify-center">
                <AlertTriangle className={cn("w-5 h-5", alert.status === 'pending' ? 'text-red-500' : 'text-[#8E9299]')} />
              </div>
              <div>
                <p className="text-white font-bold text-sm uppercase tracking-tight">{alert.type} Emergency</p>
                <p className="text-[10px] text-[#8E9299] font-bold uppercase tracking-widest">{new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
              alert.status === 'pending' ? "bg-red-500/10 text-red-500" :
              alert.status === 'responding' ? "bg-blue-500/10 text-blue-500" :
              "bg-green-500/10 text-green-500"
            )}>
              {alert.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
