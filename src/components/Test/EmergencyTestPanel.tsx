import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ShieldAlert,
  Activity,
  Flame,
  Waves,
  Skull,
  FlaskConical,
  RotateCcw,
  Zap,
} from "lucide-react";

interface EmergencyTestPanelProps {
  onTrigger?: (type: string) => void;
}

const EmergencyTestPanel: React.FC<EmergencyTestPanelProps> = ({
  onTrigger,
}) => {
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  const handleTrigger = (type: string) => {
    setActiveAlert(type);
    onTrigger?.(type);
  };

  const handleReset = () => {
    setActiveAlert(null);
  };

  const alertTypes = [
    {
      id: "sos",
      label: "SOS",
      sub: "General Alert",
      icon: ShieldAlert,
      color: "text-tactical-red",
      bg: "bg-tactical-red/10",
      border: "border-tactical-red/30",
    },
    {
      id: "medical",
      label: "MEDICAL",
      sub: "EMS Needed",
      icon: Activity,
      color: "text-tactical-cyan",
      bg: "bg-tactical-cyan/10",
      border: "border-tactical-cyan/30",
    },
    {
      id: "fire",
      label: "FIRE",
      sub: "Structural/Forest",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
    },
    {
      id: "crime",
      label: "CRIME",
      sub: "Police Needed",
      icon: Skull,
      color: "text-red-600",
      bg: "bg-red-600/10",
      border: "border-red-600/30",
    },
    {
      id: "flood",
      label: "FLOOD",
      sub: "Natural Event",
      icon: Waves,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
    {
      id: "test",
      label: "TEST",
      sub: "Internal Scan",
      icon: FlaskConical,
      color: "text-white/40",
      bg: "bg-white/5",
      border: "border-white/10",
    },
  ];

  return (
    <div className="glass-panel p-8 rounded-[40px] border-white/5 relative overflow-hidden group">
      <div className="scanline opacity-10" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Tactical Simulation Deck
          </h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
            Authorized Personnel Only — Emergency Stress Testing
          </p>
        </div>

        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-2 bg-tactical-red/20 border border-tactical-red/50 rounded-xl flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-tactical-red animate-pulse" />
            <span className="text-[10px] font-black uppercase text-tactical-red tracking-widest">
              Live Alert: {activeAlert}
            </span>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {alertTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleTrigger(type.id)}
            className={`tactical-panel p-4 rounded-2xl border ${type.border} ${type.bg} hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center gap-3 group/btn`}
          >
            <type.icon
              className={`w-8 h-8 ${type.color} group-hover/btn:scale-110 transition-transform`}
            />
            <div className="text-center">
              <p
                className={`text-xs font-black uppercase tracking-widest ${type.color}`}
              >
                {type.label}
              </p>
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter mt-0.5">
                {type.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Neural Link
        </button>
        <button
          onClick={() => handleTrigger("manual")}
          className="flex-1 px-6 py-4 bg-tactical-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-glow-cyan transition-all"
        >
          FORCE MANUAL BYPASS
        </button>
      </div>

      {!activeAlert && (
        <div className="mt-4 p-4 rounded-xl bg-black/20 text-center">
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            System Idle — Awaiting Trigger Event
          </p>
        </div>
      )}
    </div>
  );
};

export default EmergencyTestPanel;
