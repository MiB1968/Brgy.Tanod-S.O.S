import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  IconApprovedResidents, 
  IconPendingRegistration, 
  IconActiveSOS, 
  IconOnlineTanods 
} from '../TacticalIcons';
import { TacticalCard } from '../Tactical/TacticalCard';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function StatCard({ label, value, icon: Icon, color, bg, pulse, onClick }: any) {
  return (
    <TacticalCard 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group transition-all hover:bg-tactical-dark/50 active:shadow-inner",
        onClick ? "cursor-pointer" : ""
      )}
    >
      <div className={cn("p-4 rounded-2xl inline-flex mb-6 transition-all group-hover:scale-110 shadow-2xl relative z-10", bg, color, pulse && "animate-pulse shadow-[0_0_15px_var(--color-tactical-red)]")}>
        <Icon className="w-6 h-6" glow={pulse} />
      </div>
      <div className="relative z-10">
        <h4 className="text-[9px] font-black uppercase text-white/40 tracking-[0.4em] mb-2 font-mono">{label}</h4>
        <p className="text-4xl font-black text-white italic tracking-tighter font-display leading-none">{value}</p>
      </div>
    </TacticalCard>
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
        color="text-tactical-blue" 
        bg="bg-tactical-blue/10" 
        onClick={() => onTabChange('residents')}
      />
      <StatCard 
        label="Pending Registration" 
        value={pendingRegCount} 
        icon={IconPendingRegistration} 
        color="text-tactical-cyan" 
        bg="bg-tactical-cyan/10" 
        pulse={pendingRegCount > 0}
        onClick={() => onTabChange('residents')}
      />
      <StatCard 
        label="Active SOS Alerts" 
        value={activeAlertsCount} 
        icon={IconActiveSOS} 
        color="text-tactical-red" 
        bg="bg-tactical-red/10" 
        pulse={pendingAlertsCount > 0}
      />
      <StatCard 
        label="Online Tanods" 
        value={onDutyTanods.filter((t: any) => {
          const s = (t.status as string)?.toLowerCase();
          return s === 'on-duty' || s === 'on patrol' || s === 'responding' || s === 'available';
        }).length} 
        icon={IconOnlineTanods}
        color="text-tactical-cyan" 
        bg="bg-tactical-cyan/10" 
      />
    </motion.div>
  );
}
