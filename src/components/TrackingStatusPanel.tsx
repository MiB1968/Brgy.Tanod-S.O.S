import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import { tanodLocationService } from '../services/tanodLocationService';
import { useBatteryGuard } from '../hooks/useBatteryGuard';
import { batteryGuardService } from '../services/batteryGuardService';
import { ShieldCheck, BatteryCharging, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TrackingStatusPanel: React.FC = () => {
  const { profile: user } = useAuthStore();
  const { patrols: tanods } = useTanodStore();
  const [status, setStatus] = useState<'active' | 'weak' | 'inactive'>('inactive');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  const { isGuardActive, isSupported } = useBatteryGuard();
  const [manualOverrideActive, setManualOverrideActive] = useState(false);

  useEffect(() => {
    if (user?.role !== 'tanod') return;
    const interval = setInterval(() => {
      const myLocation = tanods.find(t => t.tanodId === user.uid);
      if (myLocation) {
        const lastUpdate = new Date(myLocation.lastUpdate).getTime();
        const age = Date.now() - lastUpdate;
        const acc = myLocation.location.accuracy || 999;
        setLastUpdate(new Date(lastUpdate));
        setAccuracy(acc);
        if (age < 15000 && acc < 50) setStatus('active');
        else if (age < 45000 && acc < 100) setStatus('weak');
        else setStatus('inactive');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, tanods]);

  const handleToggleManualGuard = async () => {
    if (manualOverrideActive) {
      await batteryGuardService.releaseWakeLock();
      setManualOverrideActive(false);
      toast.success("Battery Guard released. Standard energy optimization resumed.");
    } else {
      const success = await batteryGuardService.acquireWakeLock();
      if (success) {
        setManualOverrideActive(true);
        toast.success("🛡️ Tactical Wake Lock forced active (Device CPU locked awake).");
      } else {
        toast.error("Wake-lock could not be engaged on this browser.");
      }
    }
  };

  if (user?.role !== 'tanod') return null;

  const currentGuardActive = isGuardActive || manualOverrideActive;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9998] bg-[#0E1116]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          <span className="text-[11px] font-black font-mono tracking-wider text-white uppercase">
            PATROL TELEMETRY TRACKER
          </span>
        </div>
        <div className="text-right text-[10px] font-mono text-white/40">
          {lastUpdate && <span>LAST: {lastUpdate.toLocaleTimeString()}</span>}
          {accuracy && <span className="ml-2">±{accuracy.toFixed(0)}M ACCURACY</span>}
        </div>
      </div>

      {/* Battery Guard Panel info */}
      <div className="p-2.5 rounded-xl bg-black/45 border border-white/5 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {currentGuardActive ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          ) : (
            <BatteryCharging className="w-4 h-4 text-zinc-500" />
          )}
          <div>
            <div className={`text-[10px] font-bold font-mono tracking-wide ${currentGuardActive ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {currentGuardActive ? 'BATTERY GUARD: ENGAGED [WAKE LOCK ACTIVE]' : 'BATTERY GUARD: STANDBY MODE'}
            </div>
            <div className="text-[8px] text-white/30 uppercase tracking-widest font-mono mt-0.5">
              {currentGuardActive ? 'THREAD CORES ACTIVE - SLEEPLOCK PREVENTED' : 'ENGAGES AUTOMATICALLY ON EMERGENCIES'}
            </div>
          </div>
        </div>
        
        {isSupported && (
          <button
            onClick={handleToggleManualGuard}
            className={`px-2 py-1 rounded text-[8px] font-mono font-black uppercase border transition-colors ${
              manualOverrideActive 
                ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {manualOverrideActive ? 'FORCE RELEASE' : 'FORCE WAKE'}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => {
            tanodLocationService.startTracking();
            toast.success("GPS Recalibrated. Telemetry link recovered.");
          }} 
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-[10px] font-black font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          RE-CALIBRATE POSITION
        </button>
      </div>
    </div>
  );
};

export default TrackingStatusPanel;

