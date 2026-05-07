
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Alert } from '../types';
import { motion } from 'motion/react';
import { Clock, Shield, MapPin, CheckCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const CitizenReportTracker = ({ userId }: { userId: string }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      where('residentId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'alerts'));
  }, [userId]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase text-white/50 tracking-widest font-mono">Your SOS History</h3>
      {alerts.map(alert => (
        <motion.div key={alert.id} className="glass-panel p-4 rounded-xl border border-white/10 space-y-2">
          <div className="flex justify-between">
            <span className="text-white font-bold">{alert.type.toUpperCase()}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${alert.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {alert.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Clock className="w-3 h-3" /> {new Date(alert.timestamp).toLocaleString()}
          </div>
          {alert.assignedToName && (
            <div className="flex items-center gap-2 text-xs text-info">
              <Shield className="w-3 h-3" /> Patroller: {alert.assignedToName}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
