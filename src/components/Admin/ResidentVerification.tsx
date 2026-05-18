import { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { User } from '../../types';
import { CheckCircle, XCircle, Clock, Shield, Search, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface ResidentProfile extends User {
  phone?: string;
  address?: string;
  houseNumber?: string;
  householdSize?: number;
  isVerified?: boolean;
}

export const ResidentVerification = () => {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [search, setSearch] = useState('');

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await api.residents.getAll();
      setResidents(data);
    } catch (err) {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const handleVerify = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await api.residents.update(id, {
        status: status,
        isVerified: status === 'approved',
        verificationDate: new Date().toISOString()
      });
      
      // Also update the main user status
      await api.generic.update(`users/${id}`, { status });
      
      toast.success(`Resident ${status.charAt(0).toUpperCase() + status.slice(1)}`);
      loadResidents();
    } catch (err) {
      toast.error('Verification update failed');
    }
  };

  const filteredResidents = residents.filter(r => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? r.status === 'pending' :
      r.status === 'approved' || r.isVerified;
    
    const matchesSearch = 
      r.name.toLowerCase().includes(search.toLowerCase()) || 
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.address?.toLowerCase().includes(search.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-tactical-cyan" />
            Resident Verification Center
          </h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
            Review and approve community security access
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          {(['pending', 'verified', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === t 
                  ? 'bg-tactical-cyan text-black' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input 
          type="text"
          placeholder="SEARCH RESIDENTS BY NAME, EMAIL OR ADDRESS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-tactical-cyan/50 transition-all"
        />
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Establishing Secure Connection...</p>
            </div>
          ) : filteredResidents.length === 0 ? (
            <div className="py-20 text-center tactical-panel border-white/5 rounded-[32px]">
              <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">No matching residents found</p>
            </div>
          ) : (
            filteredResidents.map((resident) => (
              <motion.div
                key={resident.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="tactical-panel border-white/10 bg-white/[0.02] hover:bg-white/[0.04] rounded-[32px] p-6 transition-all group overflow-hidden relative"
              >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-16 -mt-16 transition-opacity opacity-20 ${
                  resident.status === 'pending' ? 'bg-yellow-500' : 'bg-tactical-cyan'
                }`} />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-tactical-cyan/30 transition-colors">
                      <Shield className={`w-5 h-5 ${resident.status === 'pending' ? 'text-yellow-500' : 'text-tactical-cyan'}`} />
                    </div>
                    <div>
                      <h4 className="font-black italic text-lg uppercase tracking-tight font-mono">{resident.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{resident.email}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{resident.phone || 'NO PHONE'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:flex lg:items-center gap-8">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Address</p>
                      <p className="text-[10px] font-bold uppercase truncate max-w-[200px]">{resident.address || 'Not Provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">House #</p>
                      <p className="text-[10px] font-bold uppercase">{resident.houseNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          resident.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-tactical-cyan'
                        }`} />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                          resident.status === 'pending' ? 'text-yellow-500' : 'text-tactical-cyan'
                        }`}>
                          {resident.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 md:mt-0">
                    {resident.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleVerify(resident.id, 'approved')}
                          className="flex-1 md:flex-none px-6 py-3 bg-tactical-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Verify
                        </button>
                        <button
                          onClick={() => handleVerify(resident.id, 'rejected')}
                          className="flex-1 md:flex-none px-6 py-3 bg-white/5 text-tactical-red border border-tactical-red/30 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tactical-red/10 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleVerify(resident.id, 'pending')}
                        className="px-6 py-3 bg-white/5 text-white/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/30 transition-all"
                      >
                        Reset Status
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
