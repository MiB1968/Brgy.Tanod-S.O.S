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
import { getQueueSize } from '../lib/offlineQueue';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function ResidentDashboard({ 
  profile, 
  patrols, 
  visiblePatrols, 
  isOnline, 
  deferredPrompt, 
  onInstall, 
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
  const { queuedSOSCount, setQueuedSOSCount, triggerSync, setIsOnline } = useSystemStore();
  const { activeAlert, isSending, createSOS, subscribeToUserAlerts } = useSOSStore();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [guardianMode, setGuardianMode] = useState(false);
  
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

  useEffect(() => {
    const checkQueue = async () => {
      const size = await getQueueSize();
      setQueuedSOSCount(size);
    };
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleShout = useCallback(() => {
    toast.error('SHOUT DETECTED: AUTO-INITIATING SOS', { duration: 5000, icon: '🔊' });
    handleSOS('other', 'Auto-SOS: High-decibel sound detected.');
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

  const handleSOS = async (type: EmergencyType = 'other', description: string) => {
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

      await startRecording();
      await createSOS(type, description, location);
      sosConfirmationSound.current.play();
      toast.success('SOS Protocol Initiated. Units alerted.');
    } catch (err: any) {
      toast.error('Emergency transmission failed.');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 pb-32 tactical-grid min-h-screen p-4 md:p-8">
      <ResidentHero profile={profile} setIsAboutOpen={setIsAboutOpen} guardianMode={guardianMode} setGuardianMode={setGuardianMode} />

      <AnimatePresence>
        {activeAlert && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel border-emergency/50 rounded-[48px] p-8 shadow-glow-red relative overflow-hidden">
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
        <SOSButtonPanel 
          isSending={isSending} 
          guardianMode={guardianMode} 
          setGuardianMode={setGuardianMode} 
          onInitiateSOS={handleSOS} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
            <h3 className="text-lg font-black italic tracking-tighter uppercase font-mono">Tactical Map Matrix</h3>
            <div className="h-[400px] rounded-[32px] overflow-hidden glass-panel border border-white/5 relative">
              <ActiveMap alerts={[]} patrols={visiblePatrols} />
            </div>
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
