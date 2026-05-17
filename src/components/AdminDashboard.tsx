import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { Alert, User, SystemBroadcast } from '../types';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import LiveMap from '../LiveMap';

// Sub-components
import { DashboardHeader } from './Admin/DashboardHeader';
import { AlertsFeed } from './Admin/AlertsFeed';
import { IncidentReportsSection } from './Admin/IncidentReportsSection';
import { PersonnelSidebar } from './Admin/PersonnelSidebar';
import { AdminStatsGrid } from './Admin/AdminStatsGrid';
import { ManageBroadcasts } from './Admin/ManageBroadcasts';
import AdminAnalytics from './Admin/AdminAnalytics';
import { TanodActivityLogs } from './Admin/TanodActivityLogs';
import { TanodUnitStatusList } from './Admin/TanodUnitStatusList';
import { SOSBroadcastPanel } from './Admin/SOSBroadcastPanel';
import { BroadcastReview } from './Admin/BroadcastReview';
import { EmergencyAlertBanner } from './Admin/EmergencyAlertBanner';
import { GuardianVoiceAssistant } from './ai/GuardianVoiceAssistant';
import { GuardianGreeting } from './ai/GuardianGreeting';
import { PoliceLights } from './PoliceLights';
import AboutModal from './AboutModal';
import DispatchModal from './DispatchModal';
import { AlertDetailsModal } from './AlertDetailsModal';
import { WebLLMFeatureMap } from './Admin/WebLLMFeatureMap';

// Stores & hooks
import { useIncidentStore } from '../store/useIncidentStore';
import { useTanodStore } from '../store/useTanodStore';
import { useGuardian } from '../hooks/useGuardian';
import { logIncidentAction } from '../services/logService';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function AdminDashboard({ 
  profile, 
  onTabChange, 
  deferredPrompt, 
  onInstall, 
  sirenActive, 
  onToggleSiren, 
  activeBroadcast 
}: { 
  profile: User | null, 
  onTabChange: (tab: string) => void, 
  deferredPrompt?: any, 
  onInstall?: () => void, 
  sirenActive: boolean, 
  onToggleSiren: () => void, 
  activeBroadcast: SystemBroadcast | null 
}) {
  const { alerts } = useIncidentStore();
  const { patrols, tanods } = useTanodStore();
  const { performGreeting } = useGuardian();
  const [isFlashing, setIsFlashing] = useState(false);
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] = useState<Alert | null>(null);
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState<Alert | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeatureMapOpen, setIsFeatureMapOpen] = useState(false);
  const [residentsCount, setResidentsCount] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [onDutyTanods, setOnDutyTanods] = useState<User[]>([]);

  const isActiveAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === 'pending' || status === 'active';
  };
  
  const isResolvedAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === 'resolved' || status === 'cancelled';
  };

  const activeAlertsCount = alerts.filter(a => !isResolvedAlert(a)).length;
  const pendingAlertsCount = alerts.filter(a => isActiveAlert(a)).length;

  useEffect(() => {
    // Hard restrict: Resident role should never be here, and if they are, do nothing.
    if (!profile || profile.role === 'resident') return;

    const hasActive = alerts.some(a => isActiveAlert(a));
    setIsFlashing(hasActive || sirenActive);
  }, [alerts, profile, sirenActive]);

  useEffect(() => {
    console.log('[DEBUG] AdminDashboard loadStats useEffect mounted with profile role:', profile?.role);
    // Hard restrict: Resident role should never be here, and if they are, do nothing.
    if (!profile || profile.role === 'resident') return;

    const loadStats = async () => {
      try {
        const residents = await api.residents.getAll();
        setResidentsCount(residents.filter(r => r.status === 'approved').length);
        setPendingRegCount(residents.filter(r => r.status === 'pending').length);
        
        const incidentsData = await api.incidents.getAll();
        setRecentIncidents(incidentsData);
        
        const tanodsData = await api.generic.list('users?role=tanod');
        // Deduplicate tanods by ID to prevent key errors
        const uniqueTanods = Array.from(new Map(tanodsData.map((t: any) => [t.id, t])).values()) as User[];
        setOnDutyTanods(uniqueTanods);
      } catch (err) {
        console.error("Failed to load admin dashboard data", err);
      }
    };

    loadStats();

    socket.on('resident_update', loadStats);
    socket.on('incident_new', loadStats);
    socket.on('tanod_update', loadStats);

    return () => {
      socket.off('resident_update', loadStats);
      socket.off('incident_new', loadStats);
      socket.off('tanod_update', loadStats);
    };
  }, [profile]);

  const handleUpdateStatus = async (alert: Alert, status: Alert['status']) => {
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date().toISOString() 
      };
      
      if (status === 'responding') {
        updateData.respondedBy = profile?.id || 'unknown';
        updateData.respondedByName = profile?.name || 'Admin Dispatch';
        updateData.respondedAt = new Date().toISOString();
      }
      
      if (status === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolutionNotes = `Cleared by ${profile?.name || 'Admin'}`;
        
        await api.incidents.create({
          alertId: alert.id,
          tanodId: profile?.id || 'unknown',
          tanodName: alert.respondedByName || profile?.name || 'Unknown',
          citizenName: alert.residentName || 'Resident',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          timestamp: new Date().toISOString(),
          location: alert.description || 'Location via GPS',
          gpsLocation: alert.location,
          type: alert.type,
          description: `Automatically created from a resolved alert.\nCitizen: ${alert.residentName || 'Unknown Resident'}\nResponse note: ${updateData.resolutionNotes}`,
          status: 'resolved',
          respondedAt: alert.respondedAt || updateData.respondedAt || new Date().toISOString(),
          resolvedAt: updateData.resolvedAt,
          adminOnDuty: profile?.name || 'Unknown'
        });
      }

      await api.alerts.update(alert.id, updateData);

      if (status === 'responding' || status === 'resolved') {
        const responseTime = status === 'responding' 
          ? Math.floor((new Date(updateData.respondedAt).getTime() - new Date(alert.timestamp).getTime()) / 1000)
          : undefined;

        await api.logs.create({
          tanodId: profile?.id || 'admin-system',
          tanodName: profile?.name || 'Admin Dispatch',
          type: status === 'responding' ? 'alert_response' : 'status_change',
          details: status === 'responding' 
            ? `Responding to ${alert.type} alert from ${alert.residentName}`
            : `Resolved alert from ${alert.residentName}`,
          timestamp: new Date().toISOString(),
          alertId: alert.id,
          responseTime: responseTime
        });
      }
      
      const tanodId = alert.respondedBy || updateData.respondedBy;
      if (tanodId && tanodId !== 'unknown') {
        const isResolved = status === 'resolved' || status === 'cancelled';
        const newRosterStatus = isResolved ? 'On-Duty' : status;
        await api.generic.update(`users/${tanodId}`, { 
          status: newRosterStatus,
          activeAlertId: isResolved ? null : alert.id
        });
      }
      
      await logIncidentAction({ ...alert, ...updateData });
    } catch (error: any) {
      console.error("ADMIN_ACTION_FAULT:", error);
      const errorMessage = error?.message || typeof error === 'string' ? error : JSON.stringify(error) || 'Unknown error occurred';
      toast.error(`Fault: ${errorMessage}`);
    }
  };

  const handleUpdateTanodStatus = async (tanodId: string, newStatus: string) => {
    try {
      await api.generic.update(`users/${tanodId}`, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      const isActuallyOnline = ['on-duty', 'on patrol', 'responding', 'available'].includes(newStatus.toLowerCase());
      const tanod = tanods.find(t => t.id === tanodId);
      
      await api.generic.update(`patrols/${tanodId}`, {
        isActive: isActuallyOnline,
        status: newStatus.toLowerCase().includes('responding') ? 'responding' : (isActuallyOnline ? 'patrolling' : 'offline'),
        tanodName: tanod?.name || 'Active Tanod',
        lastUpdate: new Date().toISOString()
      });

      toast.success(`Unit updated: ${newStatus}`);
    } catch (error) {
      toast.error('Unit status sync failure');
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8 pb-20 tactical-grid min-h-screen p-4 md:p-8 bg-tactical-dark"
    >
      <EmergencyAlertBanner 
        activeIncident={alerts.filter(isActiveAlert)[0] || null}
        onAcknowledge={() => {
            const first = alerts.filter(isActiveAlert)[0];
            if(first) setSelectedAlertForDetails(first);
        }}
      />
      <PoliceLights active={isFlashing} />
      
      <DashboardHeader 
        profile={profile} 
        setIsAboutOpen={setIsAboutOpen} 
        setIsFeatureMapOpen={setIsFeatureMapOpen}
      />

      {activeBroadcast && (
        <motion.div variants={itemVariants} className="tactical-panel border-tactical-red/30 bg-tactical-red/10 rounded-[40px] p-8 border-l-4 border-l-tactical-red shadow-[0_0_20px_var(--color-tactical-red)] overflow-hidden relative">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-tactical-red text-white animate-pulse">
               <span className="text-2xl font-black">!</span>
            </div>
            <div className="flex-1">
               <h4 className="text-[10px] font-black uppercase text-tactical-red tracking-widest font-mono">ACTIVE SYSTEM SOS BROADCAST</h4>
               <p className="text-xl font-black italic tracking-tighter uppercase text-white font-display mt-1">"{activeBroadcast.message}"</p>
               <p className="text-[10px] font-bold text-white/40 mt-1 uppercase">INITIATED BY ADMIN: {activeBroadcast.adminName}</p>
            </div>
          </div>
        </motion.div>
      )}

      {deferredPrompt && (
        <motion.button
          variants={itemVariants}
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-[32px] bg-tactical-cyan/10 text-tactical-cyan font-black border border-tactical-cyan/30 hover:bg-tactical-cyan/20 mb-8 transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-[0.2em] font-mono shadow-[0_0_20px_rgba(0,240,255,0.2)] group relative overflow-hidden"
        >
          <span>📲 INSTALL TANOD TACTICAL MOBILE</span>
        </motion.button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <SOSBroadcastPanel profile={profile} />
        <BroadcastReview />
      </div>

      <AdminStatsGrid 
        residentsCount={residentsCount}
        pendingRegCount={pendingRegCount} 
        activeAlertsCount={activeAlertsCount}
        pendingAlertsCount={pendingAlertsCount}
        onDutyTanods={onDutyTanods}
        onTabChange={onTabChange}
      />

      <TanodUnitStatusList 
        tanods={onDutyTanods} 
        onUpdateStatus={handleUpdateTanodStatus} 
      />

      <motion.div variants={itemVariants} className="w-full h-[600px] rounded-[32px] overflow-hidden tactical-panel border border-tactical-cyan/25 relative shadow-2xl">
        <LiveMap />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AlertsFeed 
          alerts={alerts}
          profile={profile}
          onUpdateStatus={handleUpdateStatus}
          onDispatch={setSelectedAlertForDispatch}
          onDetails={setSelectedAlertForDetails}
        />
        
        <PersonnelSidebar 
          tanods={onDutyTanods}
          patrols={patrols}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          <IncidentReportsSection recentIncidents={recentIncidents} />
          <div className="space-y-6">
            <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-mono">
              DETAILED TANOD ACTIVITY LOGS
            </h3>
            <TanodActivityLogs />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-8">
          { (profile?.role === 'admin' || profile?.role === 'superadmin') && <AdminAnalytics profile={profile} /> }
          <ManageBroadcasts />
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} role={profile?.role} />
      {selectedAlertForDispatch && (
        <DispatchModal 
          alert={selectedAlertForDispatch} 
          onClose={() => setSelectedAlertForDispatch(null)} 
          patrols={patrols}
        />
      )}
      {selectedAlertForDetails && (
        <AlertDetailsModal 
          alert={selectedAlertForDetails} 
          onClose={() => setSelectedAlertForDetails(null)} 
        />
      )}
      <AnimatePresence>
        {isFeatureMapOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0c10] w-full max-w-7xl max-h-[90vh] rounded-3xl overflow-y-auto border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => setIsFeatureMapOpen(false)}
                className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] tracking-widest uppercase transition-colors"
              >
                Close Map
              </button>
              <WebLLMFeatureMap />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
