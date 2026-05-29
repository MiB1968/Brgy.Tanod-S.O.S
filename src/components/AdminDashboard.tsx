import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import socket from '../lib/socket';
import { Alert, User, SystemBroadcast } from '../types';
import { 
  Shield, 
  Map as MapIcon, 
  Activity, 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  Cpu, 
  Settings as SettingsIcon, 
  PhoneCall, 
  AlertOctagon,
  Eye,
  Terminal,
  Grid,
  History
} from 'lucide-react';
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

import { PoliceLights } from './PoliceLights';
import AboutModal from './AboutModal';
import DispatchModal from './DispatchModal';
import { AlertDetailsModal } from './AlertDetailsModal';
import { WebLLMFeatureMap } from './Admin/WebLLMFeatureMap';
import { WorkspaceHub } from './Admin/WorkspaceHub';
import { WeatherWidget } from './Admin/WeatherWidget';
import { calendarService } from '../services/googleWorkspaceService';

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

export default function AdminDashboard(props: { 
  profile: User | null, 
  onTabChange: (tab: string) => void, 
  deferredPrompt?: any, 
  onInstall?: () => void, 
  sirenActive: boolean, 
  onToggleSiren: () => void, 
  activeBroadcast: SystemBroadcast | null,
  viewOverride?: string | null,
  setViewOverride?: (role: string | null) => void
}) {
  const { 
    profile, 
    onTabChange, 
    deferredPrompt, 
    onInstall, 
    sirenActive, 
    onToggleSiren, 
    activeBroadcast,
    viewOverride,
    setViewOverride
  } = props;

  const { alerts } = useIncidentStore();
  const { patrols, tanods } = useTanodStore();
  const { performGreeting } = useGuardian();
  const [layout, setLayout] = useState<'standard' | 'panoramic' | 'monitor'>(
    (localStorage.getItem('brgy_admin_layout') as any) || 'panoramic'
  );
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

        // Log to Google Calendar if enabled
        if (localStorage.getItem('brgy_calendar_enabled') === 'true') {
          try {
            await calendarService.createEvent({
              summary: `🚨 INCIDENT RESOLVED: ${alert.type}`,
              description: `Incident ID: ${alert.id}\nResolution: ${updateData.resolutionNotes}\nResident: ${alert.residentName}\nDispatcher: ${profile?.name}`,
              start: { dateTime: new Date(alert.timestamp).toISOString() },
              end: { dateTime: new Date().toISOString() },
              colorId: '11' // Red-ish/Orange
            });
          } catch (err) {
            console.warn("Failed to log to Google Calendar:", err);
          }
        }
      }

      await api.alerts.updateAlert(alert.id, updateData);

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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 text-zinc-400 bg-tactical-dark">
        <div className="text-center">
          <div className="animate-pulse w-12 h-12 border-2 border-tactical-cyan/20 rounded-full mx-auto mb-4" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-tactical-cyan">Initializing Tactical Interface...</p>
        </div>
      </div>
    );
  }

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
      
      {activeBroadcast && (
        <motion.div variants={itemVariants} className="tactical-panel border-tactical-red/30 bg-tactical-red/10 rounded-[40px] p-8 border-l-4 border-l-tactical-red shadow-[0_0_20px_var(--color-tactical-red)] overflow-hidden relative mb-6">
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

      <div className="flex flex-col xl:flex-row gap-6 items-start h-full">
        {/* LEFT PANEL - UNIT STATUS & FEEDS */}
        {(layout === 'panoramic' || layout === 'standard') && (
          <div className="w-full xl:w-96 space-y-6 flex-shrink-0">
            <AlertsFeed 
              alerts={alerts}
              profile={profile}
              onUpdateStatus={handleUpdateStatus}
              onDispatch={setSelectedAlertForDispatch}
              onDetails={setSelectedAlertForDetails}
            />
            <TanodUnitStatusList 
              tanods={onDutyTanods} 
              onUpdateStatus={handleUpdateTanodStatus} 
            />
            <PersonnelSidebar 
              tanods={onDutyTanods}
              patrols={patrols}
            />
          </div>
        )}

        {/* CENTER PANEL - INTEL MAP & TACTICAL HUB */}
        <div className="flex-1 w-full space-y-6">
          <EmergencyAlertBanner 
            activeIncident={alerts.filter(isActiveAlert)[0] || null}
            onAcknowledge={() => {
                const first = alerts.filter(isActiveAlert)[0];
                if(first) setSelectedAlertForDetails(first);
            }}
          />
          
          <DashboardHeader 
            profile={profile} 
            setIsAboutOpen={setIsAboutOpen} 
            setIsFeatureMapOpen={setIsFeatureMapOpen}
            layout={layout}
            setLayout={(l) => {
              setLayout(l);
              localStorage.setItem('brgy_admin_layout', l);
            }}
            viewOverride={viewOverride}
            setViewOverride={setViewOverride}
          />

          <motion.div variants={itemVariants} className="w-full h-[600px] rounded-[32px] overflow-hidden tactical-panel border border-tactical-cyan/25 relative shadow-2xl">
            <LiveMap />
          </motion.div>

          <AdminStatsGrid 
            residentsCount={residentsCount}
            pendingRegCount={pendingRegCount} 
            activeAlertsCount={activeAlertsCount}
            pendingAlertsCount={pendingAlertsCount}
            onDutyTanods={onDutyTanods}
            onTabChange={onTabChange}
          />

          {/* ── TACTICAL OPERATIONS MATRIX ────────── */}
          <motion.div variants={itemVariants} className="tactical-panel border-tactical-cyan/40 p-6 md:p-8 rounded-[32px] bg-tactical-dark/95 shadow-[0_0_20px_rgba(0,240,255,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-tactical-cyan/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-black tracking-widest text-tactical-cyan font-mono uppercase">SECURE_ROUTING_GRID</span>
                <h2 className="text-xl md:text-2xl font-black italic tracking-tight font-display text-white mt-1 flex items-center gap-2">
                  <Grid className="w-5 h-5 text-tactical-cyan animate-pulse animate-glow" />
                  TACTICAL OPERATIONS HUB
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-white/30 tracking-wider uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5 animate-pulse">
                CONNECTED_NODES: {alerts.length + patrols.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
              {[
                { id: "map", label: "Live Intel Map", icon: MapIcon, desc: "Active Heatmaps", color: "text-tactical-cyan border-tactical-cyan/10 hover:bg-tactical-cyan/5 hover:border-tactical-cyan/45 shadow-[0_0_15px_rgba(0,240,255,0.05)]" },
                { id: "tracker", label: "GPS Dispatch", icon: Activity, desc: "Tanod Live Tracks", color: "text-emerald-400 border-emerald-400/10 hover:bg-emerald-400/5 hover:border-emerald-400/45" },
                { id: "verification", label: "Verifications", icon: UserCheck, desc: "Access Clearances", color: "text-amber-400 border-amber-400/10 hover:bg-amber-400/5 hover:border-amber-400/45" },
                { id: "resident-map", label: "Locator Grid", icon: Eye, desc: "Target Overcasts", color: "text-purple-400 border-purple-400/10 hover:bg-purple-400/5 hover:border-purple-400/45" },
                { id: "roster", label: "Tanod Roster", icon: Shield, desc: "Unit Deployments", color: "text-blue-400 border-blue-400/10 hover:bg-blue-400/5 hover:border-blue-400/45" },
                { id: "schedule", label: "Shift Planner", icon: Calendar, desc: "Patrol Schedules", color: "text-indigo-400 border-indigo-400/10 hover:bg-indigo-400/5 hover:border-indigo-400/45" },
                { id: "reports", label: "Threat Feed", icon: AlertOctagon, desc: "SOS Threat Bulletins", color: "text-tactical-red border-tactical-red/10 hover:bg-tactical-red/5 hover:border-tactical-red/45" },
                { id: "records", label: "Workspace Doc", icon: FileText, desc: "Barangay Records", color: "text-zinc-300 border-zinc-300/10 hover:bg-zinc-300/5 hover:border-zinc-300/45" },
                { id: "directory", label: "SOS Directory", icon: PhoneCall, desc: "Secure Hotlines", color: "text-rose-400 border-rose-400/10 hover:bg-rose-400/5 hover:border-rose-400/45" },
                { id: "guardian", label: "Guardian AI", icon: Cpu, desc: "Sound Analysis", color: "text-fuchsia-400 border-fuchsia-400/10 hover:bg-fuchsia-400/5 hover:border-fuchsia-400/45" },
                { id: "ops", label: "Command API", icon: Terminal, desc: "Integrations & API", color: "text-teal-400 border-teal-400/10 hover:bg-teal-400/5 hover:border-teal-400/45" },
                { id: "logs", label: "System Telemetry", icon: History, desc: "Raw Activity Logs", color: "text-slate-400 border-slate-400/10 hover:bg-slate-400/5 hover:border-slate-400/45" },
                { id: "settings", label: "Config Admin", icon: SettingsIcon, desc: "Engine Settings", color: "text-teal-400 border-teal-400/10 hover:bg-teal-400/5 hover:border-teal-400/45" }
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => onTabChange(mod.id)}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border bg-black/40 transition-all active:scale-95 duration-300 hover:scale-[1.03] hover:shadow-lg select-none group cursor-pointer ${mod.color}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 ml-0 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Icon className="w-5 h-5 text-white/70 group-hover:text-white" />
                      </div>
                      <span className="text-[7px] font-mono text-white/20 font-black tracking-widest uppercase group-hover:text-white/40 transition-colors">SYNC</span>
                    </div>
                    <h4 className="text-[10px] font-black uppercase font-mono tracking-wider italic text-white/90 leading-tight group-hover:text-white transition-colors">{mod.label}</h4>
                    <p className="text-[8px] font-bold text-white/30 tracking-tight leading-normal mt-1 font-mono truncate">{mod.desc}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL - COMMAND & REPORTS */}
        {layout === 'panoramic' && (
          <div className="w-full xl:w-96 space-y-6 flex-shrink-0">
            <SOSBroadcastPanel profile={profile} />
            <BroadcastReview />
            <WeatherWidget />
            <IncidentReportsSection recentIncidents={recentIncidents} />
            <div className="mt-8 pt-8 border-t border-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 font-mono mb-4">Raw Activity Intel</h3>
              <TanodActivityLogs />
            </div>
            { (profile?.role === 'admin' || profile?.role === 'superadmin') && <AdminAnalytics profile={profile} /> }
            <ManageBroadcasts />
            <WorkspaceHub profile={profile} />
          </div>
        )}
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
