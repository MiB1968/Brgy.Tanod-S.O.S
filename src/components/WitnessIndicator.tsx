
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Eye, Users } from 'lucide-react';
import { WitnessRequest } from '../types';

interface WitnessIndicatorProps {
  alertId: string;
}

export const WitnessIndicator: React.FC<WitnessIndicatorProps> = ({ alertId }) => {
  const [witnesses, setWitnesses] = useState<WitnessRequest[]>([]);

  useEffect(() => {
    const q = collection(db, 'alerts', alertId, 'witness_requests');
    const unsub = onSnapshot(q, (snapshot) => {
        setWitnesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WitnessRequest)));
    });
    return unsub;
  }, [alertId]);

  if (witnesses.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emergency/20 border border-emergency/30 rounded-full text-emergency">
        <Users className="w-3 h-3" />
        <span className="text-[9px] font-black uppercase tracking-widest">{witnesses.length} WITNESSES</span>
    </div>
  );
};
