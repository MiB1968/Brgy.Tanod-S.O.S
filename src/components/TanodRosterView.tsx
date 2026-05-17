import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { User } from '../types';
import { useTanodStore } from '../store/useTanodStore';
import { Plus, X, MessageSquare, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TanodLogo } from './Branding';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { isWebLLMReady, promptWebLLM } from '../lib/webllm';

export default function TanodRosterView() {
  const { patrols } = useTanodStore();
  const [tanods, setTanods] = useState<User[]>([]);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitEmail, setNewUnitEmail] = useState('');

  // Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [scenarioInput, setScenarioInput] = useState('');
  const [simulatorChat, setSimulatorChat] = useState<{role: 'user'|'tanod', text: string}[]>([]);
  const [simInput, setSimInput] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);

  const handleStartSim = async () => {
       if (!scenarioInput) return;
       setIsSimLoading(true);
       setSimulatorChat([{role: 'user', text: `*[SCENARIO STARTED: ${scenarioInput}]*`}]);
       try {
            const sys = `You are a distressed Philippine resident in an emergency scenario: "${scenarioInput}". Act scared and speak Tagalog. Be brief. Wait for the Tanod to respond.`;
            const initResponse = await promptWebLLM(sys, "Tulong!");
            setSimulatorChat(prev => [...prev, {role: 'user', text: initResponse}]);
       } catch (err) {
            toast.error("WebLLM needed");
       } finally {
            setIsSimLoading(false);
       }
  };

  const handleSimChat = async () => {
       if (!simInput || isSimLoading) return;
       const q = simInput;
       setSimInput('');
       setSimulatorChat(prev => [...prev, {role: 'tanod', text: q}]);
       setIsSimLoading(true);
       try {
            const sys = `You are a distressed Philippine resident in the emergency scenario: "${scenarioInput}". A Barangay Tanod is helping you. Respond to this Tanod: "${q}". Speak Tagalog naturally.`;
            const res = await promptWebLLM(sys, q);
            setSimulatorChat(prev => [...prev, {role: 'user', text: res}]);
       } catch(err) {
            toast.error("Err");
       } finally {
            setIsSimLoading(false);
       }
  };

  const fetchTanods = async () => {
    try {
      const data = await api.generic.list('users?role=tanod');
      setTanods(data);
    } catch (err) {
      console.error("Failed to fetch roster", err);
    }
  };

  useEffect(() => {
    fetchTanods();
    socket.on('tanod_update', () => fetchTanods());
    
    return () => {
      socket.off('tanod_update');
    };
  }, []);

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitEmail.trim()) return;
    try {
      await api.generic.create('users', {
        id: Date.now().toString(),
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
      socket.emit('tanod_update', {});
    } catch (e: any) {
      console.error("Failed to add unit", e);
      toast.error('Failed to register unit');
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 md:p-12 rounded-[48px] border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-command">
        <div>
          <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white font-mono leading-none">Tanod Roster</h2>
          <p className="text-white/40 font-bold text-xs md:text-sm uppercase tracking-[0.3em] font-mono mt-3">Tactical Peacekeeping Force Inventory</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
             <button 
               onClick={() => setIsSimulatorOpen(true)}
               className="w-full md:w-auto justify-center px-10 py-5 bg-[#3b82f6]/20 border border-[#3b82f6]/50 text-[#3b82f6] font-black italic rounded-2xl hover:bg-[#3b82f6]/30 transition-all flex items-center gap-3 text-xs font-mono tracking-widest uppercase">
               <ShieldAlert className="w-5 h-5" /> OFFLINE SIMULATOR
             </button>
             <button 
               onClick={() => setAddingUnit(true)}
               className="w-full md:w-auto justify-center px-10 py-5 bg-emergency text-white font-black italic rounded-2xl hover:scale-105 transition-all flex items-center gap-3 text-xs shadow-glow-red font-mono tracking-widest uppercase">
               <Plus className="w-5 h-5 text-white" /> REGISTER UNIT
             </button>
        </div>
      </div>

      <AnimatePresence>
        {isSimulatorOpen && (
          <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="glass-panel border-[#3b82f6]/30 w-full max-w-2xl rounded-[32px] overflow-hidden flex flex-col p-8 relative h-[80vh]"
            >
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="font-black italic text-2xl tracking-tighter text-[#3b82f6] uppercase font-mono flex items-center gap-2"><ShieldAlert /> Tanod Training Simulator</h3>
                    <button onClick={() => setIsSimulatorOpen(false)} className="text-white/40 hover:text-white"><X /></button>
                </div>

                {!simulatorChat.length ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                         <p className="text-white/60 font-mono text-sm text-center">Set up a training scenario for new Tanods (e.g., "Fire at Purok 4" or "Hostage situation").</p>
                         <input 
                            type="text" 
                            value={scenarioInput}
                            onChange={(e) => setScenarioInput(e.target.value)}
                            placeholder="Type scenario here..."
                            className="bg-white/5 border border-white/20 p-4 rounded-xl text-white w-full max-w-md font-mono"
                         />
                         <button onClick={handleStartSim} disabled={isSimLoading} className="px-8 py-3 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/50 rounded-xl font-bold font-mono hover:bg-[#3b82f6]/30 uppercase text-xs tracking-widest">
                             {isSimLoading ? "INITIALIZING AI..." : "START SIMULATION"}
                         </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                         <div className="flex-1 overflow-y-auto space-y-4 p-4 border border-white/10 rounded-xl bg-black/50 mb-4">
                             {simulatorChat.map((msg, idx) => (
                                 <div key={idx} className={cn("max-w-[80%] p-4 rounded-2xl font-mono text-xs", msg.role === 'tanod' ? "bg-[#3b82f6]/20 text-white self-end ml-auto border border-[#3b82f6]/30" : "bg-white/10 text-amber-400 self-start")}>
                                      {msg.text}
                                 </div>
                             ))}
                             {isSimLoading && <div className="text-white/40 font-mono text-[10px] animate-pulse">AI Resident is typing...</div>}
                         </div>
                         <div className="flex gap-2">
                             <input type="text" value={simInput} onChange={(e) => setSimInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSimChat()} placeholder="Your response (Tanod)..." className="flex-1 bg-white/5 border border-white/20 p-4 rounded-xl text-white font-mono" />
                             <button onClick={handleSimChat} disabled={isSimLoading} className="p-4 bg-[#3b82f6]/20 text-[#3b82f6] rounded-xl hover:bg-[#3b82f6]/30"><MessageSquare /></button>
                         </div>
                    </div>
                )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          const patrolMatch = patrols.find(p => p.tanodId === t.id);
          const isActuallyActive = patrolMatch?.isActive;
          const lastSeen = patrolMatch?.lastUpdate;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={t.id} 
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
                  <p className="font-mono text-white/30 text-[9px] uppercase font-bold tracking-[0.2em]">{t.id || `UNIT-${t.id?.slice(0, 4).toUpperCase()}`}</p>
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
