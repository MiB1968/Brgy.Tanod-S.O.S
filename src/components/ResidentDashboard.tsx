import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../lib/api';
import { User, Alert, PatrolLocation, EmergencyType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { Howl } from 'howler';
import { toast } from 'react-hot-toast';

// Sub-components
import { ResidentHero } from './Resident/ResidentHero';
import { SOSButtonPanel } from './Resident/SOSButtonPanel';
import { SOSChat } from './SOSChat';
import { CitizenReportTracker } from './CitizenReportTracker';
import ActiveMap from './ActiveMap';
import AboutModal from './AboutModal';

// Stores & hooks
import { useSystemStore } from '../store/useSystemStore';
import { useSOSStore } from '../store/useSOSStore';
import { useShoutDetection } from '../hooks/useShoutDetection';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { useOfflineSOS } from '../hooks/useOfflineSOS';
import { useTTS } from '../hooks/useTTS';
import { photoService } from '../services/photoService';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

import { OfflineVoiceManager } from './OfflineVoicePackManager';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function ResidentDashboard({ 
  profile, 
  patrols, 
  visiblePatrols, 
  isOnline, 
  deferredPrompt, 
  onInstall, 
  onTabChange, 
  sirenActive, 
  onToggleSiren 
}: { 
  profile: User, 
  patrols: PatrolLocation[], 
  visiblePatrols: PatrolLocation[], 
  isOnline: boolean, 
  deferredPrompt: any, 
  onInstall: () => void, 
  onTabChange: (tab: string) => void, 
  sirenActive: boolean, 
  onToggleSiren: () => void 
}) {
  const { speak } = useTTS();
  const { setQueuedSOSCount } = useSystemStore();
  const { activeAlert, isSending, createSOS, subscribeToUserAlerts } = useSOSStore();
  const { queuedCount, handleQueueSOS, forceSync, isSyncing } = useOfflineSOS();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [guardianMode, setGuardianMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const sosConfirmationSound = useRef(new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'],
    volume: 0.7,
  }));

  useEffect(() => {
    if (profile?.id) {
      const unsubscribe = subscribeToUserAlerts(profile.id);
      return () => unsubscribe();
    }
  }, [profile?.id, subscribeToUserAlerts]);

  // Sync state between hook and system store for legacy compatibility
  useEffect(() => {
    setQueuedSOSCount(queuedCount);
  }, [queuedCount, setQueuedSOSCount]);

  const handleShout = useCallback(() => {
    toast.error('SHOUT DETECTED: AUTO-INITIATING SOS', { duration: 5000, icon: '🔊' });
    handleSOS('OTHER', 'Auto-SOS: High-decibel sound detected.');
  }, []);

  const { startListening, stopListening } = useShoutDetection(handleShout);
  
  const handleVideoChunk = useCallback(async (chunk: Blob) => {
    if (!activeAlert?.id) return;
    const service = await import('../services/StorageService');
    await service.uploadVideoChunk(activeAlert.id, chunk, Date.now());
  }, [activeAlert]);

  const { isRecording, startRecording, stopRecording } = useVideoRecorder(handleVideoChunk);
  
  useEffect(() => {
    if (guardianMode) startListening(); else stopListening();
  }, [guardianMode, startListening, stopListening]);

  useEffect(() => {
    if (!activeAlert && isRecording) stopRecording();
  }, [activeAlert, isRecording, stopRecording]);

  const handleSOS = async (type: EmergencyType = 'OTHER', description: string) => {
    if (activeAlert || isSending) return;
    
    try {
      let location;
      try {
        const gpsPos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );
        location = { lat: gpsPos.coords.latitude, lng: gpsPos.coords.longitude };
      } catch {
        location = { lat: 13.2236, lng: 120.5960 };
      }

      // Professional approach: If offline, queue immediately.
      // If online, still queue (Outbox Pattern) and then sync.
      
      const photosToProcess = [...selectedPhotos];

      if (!isOnline) {
        await handleQueueSOS(type, description, location, photosToProcess);
        speak('SOS natanggap. Tanod papunta na.', { lang: 'en' });
        setSelectedPhotos([]);
        return;
      }

      // If online, use regular store but with fallback
      try {
        await startRecording();
        
        // Convert files to base64 for direct online sending
        const b64Photos = await Promise.all(
          photosToProcess.map(async (f) => {
            const blob = await photoService.compressForSOS(f);
            return photoService.blobToBase64(blob);
          })
        );

        await createSOS(type, description, location, b64Photos);
        speak('SOS natanggap. Tanod papunta na.', { lang: 'en' });
        setSelectedPhotos([]);
        toast.success('SOS Protocol Initiated. Units alerted.');
      } catch (err) {
        console.warn('Online SOS failed, falling back to outbox queue.');
        await handleQueueSOS(type, description, location, photosToProcess);
        setSelectedPhotos([]);
      }
    } catch (err: any) {
      toast.error('Emergency transmission system failure.');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 pb-32 tactical-grid min-h-screen p-4 md:p-8">
      <ResidentHero profile={profile} setIsAboutOpen={setIsAboutOpen} guardianMode={guardianMode} setGuardianMode={setGuardianMode} />
      
      <AnimatePresence mode="wait">
        {queuedCount > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel border-info/30 bg-info/5 rounded-[32px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center animate-pulse">
                  <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-widest text-info font-mono">Tactical Outbox Active</h5>
                  <p className="text-[10px] text-white/40 font-bold uppercase font-mono">{queuedCount} SOS {queuedCount === 1 ? 'REPORT' : 'REPORTS'} QUEUED FOR SYNC</p>
                </div>
              </div>
              <button 
                onClick={forceSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-2 px-6 py-2 bg-info/20 border border-info/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-info hover:bg-info/30 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100"
              >
                {isSyncing ? 'SYNCING...' : !isOnline ? 'OFFLINE' : 'FORCE SYNC NOW'}
              </button>
            </div>
          </motion.div>
        )}

        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }} 
            className="glass-panel border-emergency/50 rounded-[48px] p-8 shadow-glow-red relative overflow-hidden"
          >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-emergency rounded-[28px] flex items-center justify-center sos-glow">
                    <Zap className="text-white w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black italic tracking-tighter text-white uppercase font-mono">Emergency Incident Live</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] font-mono">{activeAlert.status.toUpperCase()} • {activeAlert.type}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-2xl w-full">
                  <div className="flex-1 w-full">
                    <div className="h-2 bg-brand-bg rounded-full overflow-hidden mb-2">
                      <motion.div 
                        className="h-full bg-emergency shadow-glow-red"
                        animate={{ width: activeAlert.status === 'pending' ? '33.33%' : activeAlert.status === 'responding' ? '66.66%' : '100%' }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest">
                       <span>Dispatch</span>
                       <span>En Route</span>
                       <span>On Scene</span>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (window.confirm('ARE YOU SURE YOU WANT TO ABORT THIS EMERGENCY ALERT? False alerts may result in penalties.')) {
                        try {
                          const { cancelSOS } = useSOSStore.getState();
                          await cancelSOS(activeAlert.id);
                          toast.success('SOS ABORTED SUCCESSFULLY');
                        } catch (err) {
                          toast.error('ABORT FAILED: Please call hotline');
                        }
                      }
                    }}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-emergency/20 hover:text-emergency hover:border-emergency/30 transition-all active:scale-95 whitespace-nowrap relative z-50 cursor-pointer"
                  >
                    Abort SOS
                  </button>
                </div>
              </div>
             <div className="mt-8 border-t border-white/5 pt-8">
               <SOSChat alertId={activeAlert.id} currentUser={profile} />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeAlert && (
        <>
          <SOSButtonPanel 
            isSending={isSending} 
            guardianMode={guardianMode} 
            setGuardianMode={setGuardianMode} 
            onInitiateSOS={handleSOS} 
          />

          {/* Tactical Photo Evidence Area */}
          <div className="max-w-2xl mx-auto mb-12 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 font-mono">Tactical Evidence (Max 4)</label>
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white/60 hover:bg-white/10 transition-colors"
              >
                <Camera className="w-3 h-3" />
                Add Image
              </button>
              <input 
                type="file" 
                ref={photoInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedPhotos(prev => [...prev, ...files].slice(0, 4));
                }}
              />
            </div>

            {selectedPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <AnimatePresence>
                  {selectedPhotos.map((file, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="relative min-w-[120px] h-24 rounded-2xl overflow-hidden border border-white/10 bg-black/40 group"
                    >
                      <img 
                        src={URL.createObjectURL(file)} 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                        alt="Evidence"
                      />
                      <button 
                        onClick={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-emergency transition-colors backdrop-blur-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
            <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono">Tactical Map Matrix</h3>
            <div className="h-[400px] rounded-[32px] overflow-hidden glass-panel border border-white/5 relative">
              <ActiveMap alerts={[]} patrols={visiblePatrols} />
            </div>
            
            <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono mt-8">System Configuration</h3>
            <OfflineVoiceManager />
        </div>
        <div className="space-y-8">
            <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono">Personal Incident Tracker</h3>
            <CitizenReportTracker userId={profile.id} />
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} role={profile?.role} />
    </motion.div>
  );
}
