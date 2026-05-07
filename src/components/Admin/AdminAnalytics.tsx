import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Incident } from '../../types';
import { motion } from 'motion/react';
import { BarChart as ChartIcon } from 'lucide-react';

interface AdminAnalyticsProps {
  incidents: Incident[];
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6'];

export default function AdminAnalytics({ incidents }: AdminAnalyticsProps) {
  
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      counts[inc.type] = (counts[inc.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const timeData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      const date = new Date(inc.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[date] = (counts[date] || 0) + 1;
    });
    
    // Sort chronologically and take last 7
    return Object.entries(counts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([name, value]) => ({ name, value }));
  }, [incidents]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ChartIcon className="w-5 h-5 text-info" />
        <h3 className="text-sm font-black uppercase text-white tracking-widest font-mono">Incident Intelligence</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border-white/5">
          <p className="text-[10px] font-black text-white/40 mb-6 uppercase tracking-widest font-mono">Frequency by Type</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {typeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0D0D12', borderColor: 'rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-white/5">
          <p className="text-[10px] font-black text-white/40 mb-6 uppercase tracking-widest font-mono">Recent Daily Trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D12', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
