
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { SystemBroadcast } from '../../types';
import { motion } from 'motion/react';
import { Megaphone, Plus, X, Globe } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export function ManageBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SystemBroadcast['type']>('other');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SystemBroadcast));
      setBroadcasts(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'broadcasts'));
    return unsubscribe;
  }, []);

  const handleAdd = async () => {
    if (!message || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'broadcasts'), {
        adminId: auth.currentUser.uid,
        adminName: 'Admin', // In real app fetch properly
        message,
        type,
        isActive: true,
        timestamp: serverTimestamp(),
      });
      setMessage('');
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'broadcasts');
    }
  };

  const toggleBroadcast = async (broadcast: SystemBroadcast) => {
    try {
      await updateDoc(doc(db, 'broadcasts', broadcast.id), { isActive: !broadcast.isActive });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `broadcasts/${broadcast.id}`);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-black uppercase text-sm flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emergency" /> System Broadcasts
        </h3>
        <button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-3 bg-[#252932] p-4 rounded-xl">
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full bg-[#1A1D23] p-2 rounded-lg text-white">
            <option value="evacuation">Evacuation</option>
            <option value="calamity">Calamity</option>
            <option value="security">Security</option>
            <option value="other">Other</option>
          </select>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Emergency broadcast message..." className="w-full bg-[#1A1D23] p-3 rounded-lg text-white text-sm" />
          <button onClick={handleAdd} className="w-full py-2 bg-emergency rounded-lg text-white font-bold">SEND BROADCAST</button>
        </div>
      )}

      <div className="space-y-2">
        {broadcasts.map(b => (
          <div key={b.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <Globe className={`w-3 h-3 ${b.isActive ? 'text-green-500' : 'text-gray-500'}`} />
              <span>{b.message}</span>
            </div>
            <button onClick={() => toggleBroadcast(b)} className={`px-2 py-1 rounded ${b.isActive ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
              {b.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
