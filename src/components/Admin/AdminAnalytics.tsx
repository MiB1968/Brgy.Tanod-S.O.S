import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { motion } from 'motion/react';
import { BarChart as ChartIcon, Zap, Shield, Users, Activity } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6'];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics/dashboard', {
          credentials: 'include'
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Pulse every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="glass-panel p-12 rounded-[40px] border-white/5 flex flex-col items-center justify-center animate-pulse">
        <Activity className="w-12 h-12 text-info opacity-20 mb-4" />
        <p className="text-[10px] font-black uppercase text-white/20 tracking-tighter font-mono">Syncing tactical intel...</p>
      </div>
    );
  }

  const { overview, alertsByType, alertsHistory } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-info/10 rounded-2xl">
            <Zap className="w-6 h-6 text-info" />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white font-mono leading-none">Command Analytics</h3>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 text-info">Live CockroachLab Intelligence</p>
          </div>
        </div>
        <div className="flex gap-4">
          <MetricSmall label="Verified Residents" value={overview.verified_residents} icon={Shield} color="text-success" />
          <MetricSmall label="Online Patrols" value={overview.total_tanods} icon={Users} color="text-info" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel p-8 rounded-[40px] border-white/5 relative overflow-hidden group">
          <div className="scanline opacity-10" />
          <p className="text-[10px] font-black text-white/40 mb-8 uppercase tracking-widest font-mono flex items-center gap-2">
            <Activity className="w-3 h-3 text-emergency" /> Emergency Distribution
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={alertsByType} 
                  innerRadius={70} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="count" 
                  nameKey="type"
                  stroke="none"
                >
                  {alertsByType.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0D0D12', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                  itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            {alertsByType.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.type} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[9px] font-black text-white/60 uppercase font-mono">{item.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel p-8 rounded-[40px] border-white/5 relative overflow-hidden group">
          <div className="absolute top-8 right-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg rounded-xl border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest font-mono">Real-time Feed</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-white/40 mb-8 uppercase tracking-widest font-mono flex items-center gap-2">
            <ChartIcon className="w-3 h-3 text-info" /> Incident Response Timeline
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertsHistory.map((h: any) => ({ ...h, day: new Date(h.day).toLocaleDateString('en-US', { weekday: 'short' }) }))}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0D0D12', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} 
                  itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricSmall({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-brand-bg rounded-[24px] border border-white/5">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="flex flex-col">
        <span className="text-xl font-black text-white italic font-mono leading-none">{value}</span>
        <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter font-mono">{label}</span>
      </div>
    </div>
  );
}
