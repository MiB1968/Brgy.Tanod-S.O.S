import { useEffect, useState } from 'react';
import { Users, Shield, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { generic, residents } from '../../lib/api';

export default function RoleStatsCards() {
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalTanods: 0,
    totalResidents: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersList = await generic.list('users');
        const residentsList = await residents.getAll();
        
        let admins = 0;
        let tanods = 0;
        let pending = 0;
        let activeResidents = 0;

        usersList.forEach((u: any) => {
          if (u.role === 'admin') admins++;
          if (u.role === 'tanod') tanods++;
          if (u.role === 'resident' && u.status === 'active') activeResidents++;
        });

        residentsList.forEach((r: any) => {
          if (r.status === 'pending') pending++;
        });

        setStats({
          totalAdmins: admins,
          totalTanods: tanods,
          totalResidents: activeResidents,
          pendingVerifications: pending,
        });
      } catch (err) {
        console.error('Failed to fetch stats for cards:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-darker border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/60 font-mono text-sm tracking-wider uppercase">Command</div>
          <ShieldAlert className="w-5 h-5 text-amber-500" />
        </div>
        <div className="text-3xl font-black text-white">{stats.totalAdmins}</div>
      </div>
      
      <div className="bg-darker border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/60 font-mono text-sm tracking-wider uppercase">Active Tanods</div>
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div className="text-3xl font-black text-white">{stats.totalTanods}</div>
      </div>

      <div className="bg-darker border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/60 font-mono text-sm tracking-wider uppercase">Residents</div>
          <Users className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="text-3xl font-black text-white">{stats.totalResidents}</div>
      </div>

      <div className="bg-darker border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/60 font-mono text-sm tracking-wider uppercase">Pending Queue</div>
          <Clock className="w-5 h-5 text-tactical-cyan" />
        </div>
        <div className="text-3xl font-black text-tactical-cyan">{stats.pendingVerifications}</div>
      </div>
    </div>
  );
}
