import React from 'react';
import { motion } from 'motion/react';
import { Shield, MapPin, Clock, User } from 'lucide-react';
import { Incident } from '../../types';

interface DispatchAlertProps {
  incident: Incident;
  onDispatch: (incidentId: string) => void;
}

export const DispatchAlert = ({ incident, onDispatch }: DispatchAlertProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel border-l-4 border-red-500 p-4 rounded-xl space-y-3"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="bg-red-500/10 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-bold">{incident.type}</h4>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <MapPin className="w-3 h-3" /> {incident.location}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-white/60">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(incident.timestamp).toLocaleTimeString()}</div>
        <div className="flex items-center gap-1"><User className="w-3 h-3" /> {incident.tanodName}</div>
      </div>

      <button 
        onClick={() => onDispatch(incident.id)}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors"
      >
        Dispatch Units Now
      </button>
    </motion.div>
  );
};
