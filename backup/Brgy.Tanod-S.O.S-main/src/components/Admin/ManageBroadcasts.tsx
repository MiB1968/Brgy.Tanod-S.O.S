
import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import socket from '../../lib/socket';
import { SystemBroadcast } from '../../types';
import { motion } from 'motion/react';
import { Megaphone, Plus, X, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function ManageBroadcasts() {
  const { profile } = useAuthStore();
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SystemBroadcast['type']>('other');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        const data = await api.generic.list('broadcasts');
        setBroadcasts(data);
      } catch (err) {
        console.error("Failed to load broadcasts", err);
      }
    };

    loadBroadcasts();
    socket.on('broadcast_update', () => loadBroadcasts());

    return () => {
      socket.off('broadcast_update');
    };
  }, []);

  const handleAdd = async () => {
    if (!message) return;
    try {
      await api.generic.create('broadcasts', {
        adminId: profile?.id || '00000000-0000-0000-0000-000000000000',
        adminName: profile?.name || 'Admin',
        message,
        type,
        isActive: true,
        timestamp: new Date().toISOString(),
      });
      setMessage('');
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add broadcast", err);
    }
  };

  const toggleBroadcast = async (broadcast: SystemBroadcast) => {
    try {
      await api.generic.update(`broadcasts/${broadcast.id}`, { isActive: !broadcast.isActive });
    } catch (err) {
      console.error("Failed to toggle broadcast", err);
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
