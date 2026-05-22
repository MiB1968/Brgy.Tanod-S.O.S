import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTanodStore } from '../store/useTanodStore';
import { tanodLocationService } from '../services/tanodLocationService';

const TrackingStatusPanel: React.FC = () => {
  const { profile: user } = useAuthStore();
  const { patrols: tanods } = useTanodStore();
  const [status, setStatus] = useState<'active' | 'weak' | 'inactive'>('inactive');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

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

  if (user?.role !== 'tanod') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-medium">My Tracking Status</div>
        </div>
        <div className="text-right text-xs text-zinc-400">
          {lastUpdate && <div>Last: {lastUpdate.toLocaleTimeString()}</div>}
          {accuracy && <div>±{accuracy.toFixed(0)}m</div>}
        </div>
      </div>
      <button onClick={() => tanodLocationService.startTracking()} className="w-full mt-4 bg-green-600 py-3 rounded-xl text-sm font-medium">Restart</button>
    </div>
  );
};

export default TrackingStatusPanel;
