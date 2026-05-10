import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  IconApprovedResidents, 
  IconPendingRegistration, 
  IconActiveSOS, 
  IconOnlineTanods 
} from '../TacticalIcons';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function StatCard({ label, value, icon: Icon, color, bg, pulse, onClick }: any) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "glass-panel border-white/5 rounded-[40px] p-8 relative overflow-hidden group transition-all hover:bg-brand-card hover:border-white/10 active:shadow-inner",
        onClick ? "cursor-pointer" : ""
      )}
    >
      <div className="absolute inset-0 tactical-grid opacity-10" />
      <div className="scanline opacity-5" />
      <div className={cn("p-5 rounded-[24px] inline-flex mb-8 transition-all group-hover:scale-110 shadow-2xl relative z-10", bg, color, pulse && "animate-pulse shadow-glow-red")}>
        <Icon className="w-7 h-7" glow={pulse} />
      </div>
      <div className="relative z-10">
        <h4 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] mb-3 font-mono">{label}</h4>
        <p className="text-5xl font-black text-white italic tracking-tighter font-mono leading-none outline-text">{value}</p>
      </div>
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/2 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700"></div>
    </motion.div>
  );
}

export function AdminStatsGrid({ 
  residentsCount, 
  pendingRegCount, 
  activeAlertsCount, 
  pendingAlertsCount, 
  onDutyTanods,
  onTabChange 
}: any) {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard 
        label="Approved Residents" 
        value={residentsCount} 
        icon={IconApprovedResidents} 
        color="text-info" 
        bg="bg-info/10" 
        onClick={() => onTabChange('residents')}
      />
      <StatCard 
        label="Pending Registration" 
        value={pendingRegCount} 
        icon={IconPendingRegistration} 
        color="text-caution" 
        bg="bg-caution/10" 
        pulse={pendingRegCount > 0}
        onClick={() => onTabChange('residents')}
      />
      <StatCard 
        label="Active SOS Alerts" 
        value={activeAlertsCount} 
        icon={IconActiveSOS} 
        color="text-emergency" 
        bg="bg-emergency/10" 
        pulse={pendingAlertsCount > 0}
      />
      <StatCard 
        label="Online Tanods" 
        value={onDutyTanods.filter((t: any) => {
          const s = (t.status as string)?.toLowerCase();
          return s === 'on-duty' || s === 'on patrol' || s === 'responding' || s === 'available';
        }).length} 
        icon={IconOnlineTanods}
        color="text-success" 
        bg="bg-success/10" 
      />
    </motion.div>
  );
}
