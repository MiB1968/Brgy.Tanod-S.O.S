import React, { useState } from 'react';
import { useTanodIntegration } from '../hooks/useTanodIntegration';
import { TanodStatus } from '../types/tanod';

export const TanodStatusPanel: React.FC = () => {
  const { activeTanods, isTanod, updateTanodStatus } = useTanodIntegration();
  const [currentStatus, setCurrentStatus] = useState<TanodStatus>('on_patrol');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isTanod) return null;

  const statusOptions: { value: TanodStatus; label: string; color: string; bg: string; dot: string }[] = [
    { value: 'available', label: 'Available', color: 'text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/10', bg: 'bg-emerald-500/15', dot: 'bg-emerald-500' },
    { value: 'on_patrol', label: 'On Patrol', color: 'text-sky-400 border-sky-500/35 hover:bg-sky-500/10', bg: 'bg-sky-500/15', dot: 'bg-sky-500' },
    { value: 'responding', label: 'Responding', color: 'text-amber-400 border-amber-500/35 hover:bg-amber-500/10', bg: 'bg-amber-500/15', dot: 'bg-amber-500 animate-pulse' },
    { value: 'offline', label: 'Offline', color: 'text-zinc-400 border-zinc-700/50 hover:bg-zinc-800', bg: 'bg-zinc-800/50', dot: 'bg-zinc-500' },
  ];

  const handleStatusChange = async (status: TanodStatus) => {
    setIsUpdating(true);
    try {
      await updateTanodStatus(status);
      setCurrentStatus(status);
    } catch (err) {
      console.error('[TanodStatusPanel] Failed to update status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Tanod Dispatch & Tracking</h3>
          <p className="text-[11px] text-zinc-400">Manage your real-time availability on the barangay map</p>
        </div>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {statusOptions.map((opt) => {
          const isSelected = currentStatus === opt.value;
          return (
            <button
              id={`tanod-status-btn-${opt.value}`}
              key={opt.value}
              disabled={isUpdating}
              onClick={() => handleStatusChange(opt.value)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all active:scale-95 duration-150 cursor-pointer ${
                isSelected 
                  ? `${opt.bg} ${opt.color} border-current ring-1 ring-current/20 scale-[1.02]` 
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
              <span className="capitalize">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>Active Tanods Patrol (Live):</span>
        <span className="text-zinc-300 font-semibold">{activeTanods.length} online</span>
      </div>
    </div>
  );
};
