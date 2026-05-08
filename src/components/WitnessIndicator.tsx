
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Eye, Users } from 'lucide-react';
import { WitnessRequest } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface WitnessIndicatorProps {
  alertId: string;
}

export const WitnessIndicator: React.FC<WitnessIndicatorProps> = ({ alertId }) => {
  const [witnesses, setWitnesses] = useState<WitnessRequest[]>([]);

  useEffect(() => {
    if (!alertId) return;
    const q = query(
      collection(db, 'witness_invites'),
      where('alertId', '==', alertId),
      where('status', '==', 'accepted')
    );
    const unsub = onSnapshot(q, (snapshot) => {
        setWitnesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WitnessRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'witness_invites_active'));
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
