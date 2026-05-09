import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, PatrolLocation } from '../types';
import { useTanodStore } from '../store/useTanodStore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TanodLogo } from './Branding';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

export default function TanodRosterView() {
  const { patrols } = useTanodStore();
  const [tanods, setTanods] = useState<User[]>([]);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitEmail, setNewUnitEmail] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'users'), where('role', '==', 'tanod'));
    return onSnapshot(q, (snap) => {
      setTanods(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tanod_roster'));
  }, []);

  const patrolMap = useMemo(() => {
    const map: Record<string, typeof patrols[0]> = {};
    for (const p of patrols) {
      map[p.tanodId] = p;
    }
    return map;
  }, [patrols]);

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitEmail.trim() || !db) return;
    try {
      await addDoc(collection(db, 'users'), {
        uid: Date.now().toString(),
        name: newUnitName,
        email: newUnitEmail,
        role: 'tanod',
        status: 'approved',
        createdAt: new Date().toISOString()
      });
      setAddingUnit(false);
      setNewUnitName('');
      setNewUnitEmail('');
      toast.success('Unit Registered Successfully');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 md:p-12 rounded-[48px] border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-command">
        <div>
          <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white font-mono leading-none">Tanod Roster</h2>
          <p className="text-white/40 font-bold text-xs md:text-sm uppercase tracking-[0.3em] font-mono mt-3">Tactical Peacekeeping Force Inventory</p>
        </div>
        <button 
          onClick={() => setAddingUnit(true)}
          className="w-full md:w-auto justify-center px-10 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-105 transition-all flex items-center gap-3 text-xs shadow-glow-red font-mono tracking-widest uppercase">
          <Plus className="w-5 h-5 text-white" /> REGISTER UNIT
        </button>
      </div>

      <AnimatePresence>
        {addingUnit && (
          <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="glass-panel border-white/10 w-full max-w-lg rounded-[48px] overflow-hidden shadow-command flex flex-col p-10 md:p-14 relative"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-emergency/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <h3 className="font-black italic text-2xl md:text-3xl tracking-tighter text-white mb-4 uppercase font-mono leading-none">Initialize New Unit</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-10 font-mono">Deploy authorized personnel to the network</p>
              
              <div className="space-y-6 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase mb-2 block font-mono">Operator Identity</label>
                  <input 
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="e.g. Officer Cruz"
                    className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 text-white placeholder-white/10 focus:outline-none focus:border-emergency/50 font-mono font-bold italic"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase mb-2 block font-mono">Communication Link (Email)</label>
                  <input 
                    type="email"
                    value={newUnitEmail}
                    onChange={(e) => setNewUnitEmail(e.target.value)}
                    placeholder="unit_alpha@brgy.gov"
                    className="w-full bg-brand-bg/50 border border-white/5 rounded-2xl p-5 text-white placeholder-white/10 focus:outline-none focus:border-emergency/50 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setAddingUnit(false)}
                  className="flex-1 py-5 glass-panel border-white/10 text-white/40 font-black rounded-2xl hover:bg-white/5 transition-all text-xs uppercase font-mono tracking-widest"
                >
                  ABORT
                </button>
                <button 
                  onClick={handleAddUnit}
                  className="flex-1 py-5 bg-emergency text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase font-mono tracking-widest italic shadow-glow-red"
                >
                  CONFIRM DEPLOYMENT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 staggered-list">
        {tanods.map((t, index) => {
          const patrolMatch = patrolMap[t.uid];
          const isActuallyActive = patrolMatch?.isActive;
          const lastSeen = patrolMatch?.lastUpdate;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={t.uid} 
              className="glass-panel border-white/5 rounded-[40px] p-8 relative overflow-hidden group hover:border-white/10 hover:bg-white/5 transition-all shadow-command skew-card"
            >
              <div className="absolute inset-0 tactical-grid opacity-5" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 transition-all group-hover:bg-success/15"></div>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 bg-brand-card rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-success/30 transition-colors shadow-lg">
                  <TanodLogo size={44} animated={false} className="drop-shadow-lg" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-2xl font-black italic tracking-tighter text-white truncate uppercase font-mono leading-none">{t.name}</h4>
                    {isActuallyActive && <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-glow-success" />}
                  </div>
                  <p className="font-mono text-white/30 text-[9px] uppercase font-bold tracking-[0.2em]">{t.id || `UNIT-${t.uid?.slice(0, 4).toUpperCase()}`}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center p-4 bg-brand-bg/50 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] font-mono">Duty Status</span>
                  <div className="flex flex-col items-end">
                      <span className={cn(
                        "flex items-center gap-2 text-[10px] font-black uppercase italic font-mono",
                        isActuallyActive ? (patrolMatch?.status === 'responding' ? "text-emergency animate-pulse" : "text-success") : "text-white/40"
                      )}>
                         {isActuallyActive 
                           ? (patrolMatch?.status === 'responding' ? 'RESPONDING' : 'ON_PATROL') 
                           : 'OFFLINE'}
                      </span>
                    {t.activeAlertId && (
                      <span className="text-[7px] font-mono text-emergency font-black uppercase mt-1 tracking-tighter">
                        REQ: {t.activeAlertId?.slice(-8).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-brand-bg/50 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] font-mono">Last Location Ping</span>
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-[10px] font-black uppercase italic font-mono",
                      lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 300000) ? "text-success" : "text-white/60"
                    )}>
                      {lastSeen ? new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'NEVER_SYNCED'}
                    </span>
                    {lastSeen && (
                      <span className="text-[7px] font-mono text-white/20 uppercase font-black mt-1">
                        {Math.floor((new Date().getTime() - new Date(lastSeen).getTime()) / 60000)} MINS AGO
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-brand-bg/50 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] font-mono">Tactical Status</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase italic font-mono",
                    isActuallyActive ? (patrolMatch?.status === 'responding' ? "text-emergency shadow-glow-red" : "text-success") : "text-caution"
                  )}>
                    {isActuallyActive 
                      ? (patrolMatch?.status === 'responding' ? 'COMBAT_ACTIVE' : 'ACTIVE_ON_GRID') 
                      : 'SIGNAL_LOST'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => toast.success(`Accessing tactical profile for ${t.name}`, { icon: '👮' })}
                  className="flex-1 py-4 glass-panel border-white/10 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/30 rounded-2xl transition-all font-mono">
                  Logistics
                </button>
                <button 
                  onClick={() => toast.success(`Retrieving operational history for ${t.name}`, { icon: '📋' })}
                  className="flex-1 py-4 glass-panel border-white/10 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/30 rounded-2xl transition-all font-mono">
                  History
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
