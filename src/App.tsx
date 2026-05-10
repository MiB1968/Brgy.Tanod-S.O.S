/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import socket from './lib/socket';
import * as api from './lib/api';
import { 
  User, 
  Alert, 
  AlertStatus,
  UserRole, 
  PatrolLocation, 
  SystemBroadcast,
  EmergencyType,
  ResidentProfile
} from './types';
import { 
  LogOut, 
  Plus,
  AlertTriangle, 
  Shield, 
  User as UserIcon, 
  LayoutDashboard,
  Clock,
  Map as MapIcon,
  Volume2,
  VolumeX,
  MapPin,
  Clock3,
  Search,
  Users,
  Calendar,
  FileText,
  Settings,
  Bell,
  Menu,
  X as XIcon,
  ChevronRight,
  ChevronLeft,
  Filter,
  Download,
  Printer,
  Share2,
  Info,
  Radio,
  Phone,
  Flame,
  Activity,
  AlertCircle,
  Stethoscope,
  Waves,
  Zap,
  CheckCircle2,
  Eye,
  EyeOff,
  Navigation,
  Globe,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdminDashboard from './components/AdminDashboard';
import TanodDashboard from './components/TanodDashboard';
import { BroadcastOverlay } from './components/BroadcastOverlay';
import { NavigationSidebar } from './components/NavigationSidebar';
import { WitnessOverlay } from './components/WitnessOverlay';
import { Toaster, toast } from 'react-hot-toast';
import { TanodLogo, BackgroundPattern } from './components/Branding';
import TanodCommandAlert from './components/TanodCommandAlert';
import BackgroundServices from './components/BackgroundServices';
import SirenController from './components/SirenController';
import DashboardView from './components/DashboardView';
import ActiveMap from './components/ActiveMap';
import AdminResidents from './components/AdminResidents';
import DirectoryView from './components/DirectoryView';
import ScheduleView from './components/ScheduleView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import TanodRosterView from './components/TanodRosterView';
import { TanodActivityLogs } from './components/Admin/TanodActivityLogs';
import IncidentForm from './components/IncidentForm';
import ResidentTacticalMap from './components/Admin/ResidentTacticalMap';
import RegistrationForm from './components/RegistrationForm';
import { LoginView, RoleSelection, PendingApproval, RejectedScreen } from './components/AuthViews';
import LiveMap from './LiveMap';
import { useAuthStore } from './store/useAuthStore';
import { useIncidentStore } from './store/useIncidentStore';
import { useTanodStore } from './store/useTanodStore';
import { useSystemStore } from './store/useSystemStore';
import { useSOSStore } from './store/useSOSStore';

// Service & Lib imports
import { analyzeIncident } from './services/aiService';
import { getQueueSize } from './lib/offlineQueue';
import { cn, isValidCoord } from './lib/utils';
import { 
  isRuben as checkIsRuben, 
  PATROL_TIMEOUT, 
  navItems, 
  containerVariants 
} from './constants';

export default function App() {
  const { 
    profile, 
    setProfile, 
    residentProfile, 
    setResidentProfile, 
    isLoading: loading, 
    setIsLoading: setLoading 
  } = useAuthStore();
  const { alerts, setAlerts, addAlert } = useIncidentStore();
  const { patrols, setPatrols, setTanods, updateTanodStatus, updatePatrol } = useTanodStore();
  const { 
    isOnline, 
    setIsOnline, 
    queuedSOSCount, 
    setQueuedSOSCount, 
    triggerSync 
  } = useSystemStore();
  const { subscribeToUserAlerts } = useSOSStore();
  
  const [user, setUser] = useState<any | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'tracker' | 'reports' | 'directory' | 'schedule' | 'residents' | 'resident-map' | 'roster' | 'settings' | 'logs'>('home');
  const [isIncidentFormOpen, setIsIncidentFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [viewOverride, setViewOverride] = useState<'admin' | 'tanod' | 'resident' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [globalSirenActive, setGlobalSirenActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<SystemBroadcast | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const isMasterAdmin = useMemo(() => {
    return checkIsRuben(user?.id, user?.email || undefined);
  }, [user?.id, user?.email]);
  
  const baseRole = useMemo(() => {
    if (isMasterAdmin) return 'superadmin';
    return profile?.role || 'guest';
  }, [isMasterAdmin, profile?.role]);

  const effectiveRole = viewOverride || baseRole;

  const effectiveProfile = useMemo(() => {
    if (!profile && !user) return null;
    const p = profile || { id: user?.id, name: user?.name, email: user?.email } as User;
    return { 
      ...p, 
      role: effectiveRole as UserRole,
      name: checkIsRuben(user?.id, user?.email || undefined) ? `${p.name} (SuperAdmin)` : p.name
    } as User;
  }, [profile, effectiveRole, user]);

  const visiblePatrols = useMemo(() => {
    return patrols.filter(p => {
      // Basic coordinates check
      if (!p.location || !isValidCoord(p.location.lat, p.location.lng)) return false;

      if (['admin', 'superadmin', 'tanod'].includes(effectiveRole)) {
        // For staff, show all who are marked active OR have pinged recently
        const isRecentlyActive = p.lastUpdate ? (Date.now() - new Date(p.lastUpdate).getTime() < PATROL_TIMEOUT) : false;
        return p.isActive || isRecentlyActive;
      }
      if (effectiveRole === 'resident' && profile) {
        // Residents only see Tanods assigned to them
        return alerts.some(a => 
          a.residentId === profile.id && 
          (a.status === 'pending' || a.status === 'responding') && 
          a.assignedTo === p.tanodId
        );
      }
      return false;
    });
  }, [patrols, effectiveRole, profile, alerts]);

  // Authentication persistence
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setProfile(u);
    }
    setLoading(false);
  }, [setProfile, setLoading]);

  // Initial Load of Data
  useEffect(() => {
    // Request notification permission on load
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    async function loadInitialData() {
      if (!user) return;
      try {
        const [alertsData, patrolsData, tanodsData] = await Promise.all([
          api.alerts.getAll(),
          api.generic.list('patrols'),
          api.generic.list('users?role=tanod')
        ]);
        setAlerts(alertsData);
        setPatrols(patrolsData);
        setTanods(tanodsData);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    loadInitialData();
  }, [user, setAlerts, setPatrols]);

  // SOS Store Subscription
  useEffect(() => {
    if (user?.id && effectiveRole === 'resident') {
      const unsubscribe = subscribeToUserAlerts(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, effectiveRole, subscribeToUserAlerts]);

  // Global Siren Sync
  useEffect(() => {
    if (!user) return;
    
    // Listen for siren via socket
    socket.on('siren_update', (data: any) => {
      setGlobalSirenActive(data?.sirenActive || false);
      if (data?.sirenActive) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 2000);
      }
    });

    return () => {
      socket.off('siren_update');
    };
  }, [user]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync(); // Flush queue
      toast.success("Connection Restored: Syncing Incident Log...");
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, triggerSync]);

  const toggleGlobalSiren = async () => {
    try {
      const nextState = !globalSirenActive;
      await api.system.updateSiren({
        sirenActive: nextState,
        sirenTriggeredBy: profile?.name || 'System',
        sirenTriggeredAt: new Date().toISOString()
      });
      
      toast.success(nextState ? 'GLOBAL SIREN BROADCAST ACTIVE' : 'Global Siren Off', { 
        icon: nextState ? '📢' : '🔇',
        style: nextState ? { background: '#FF4B4B', color: '#fff' } : {}
      });
    } catch (err) {
      console.error(err);
      toast.error('Siren Control System Failure');
    }
  };

  // Failsafe Loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  const handleLogin = async (email?: string, password?: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    try {
      if (email && password) {
        const res = await api.auth.login({ email, password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setUser(res.user);
        setProfile(res.user);
        toast.success(`Unit Authenticated`, { icon: '🔑' });
      } else {
        toast.error("Google Login migrated to Auth Provider. Use standard login for now.");
      }
    } catch (err: any) {
      console.error("AUTH_FAULT:", err);
      toast.error(`AUTH FAILURE: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    }
  };

  const resetAuthSession = async () => {
    await handleLogout();
  };

  // Socket Listeners for Real-time Updates (Replacing Firestore snapshots)
  useEffect(() => {
    if (!profile) return;

    const showSOSNotification = (alert: Alert) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`🚨 SOS EMERGENCY: ${alert.type}`, {
          body: `Resident: ${alert.residentName}\nLocation tracked. Tactical units notified.`,
          icon: '/sos-icon.png',
          tag: alert.id,
          requireInteraction: true, // Keep until dismissed for critical alerts
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          setActiveTab('tracker');
          notification.close();
        };
      }
    };

    socket.on('alert_update', (data: any) => {
      const alert = data.alert;
      if (!alert) return;
      
      const formattedAlert: Alert = {
        id: alert.id,
        residentId: alert.resident_id || alert.residentId,
        residentName: alert.residentName || 'Resident',
        type: alert.type as EmergencyType,
        location: typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location,
        status: alert.status as AlertStatus,
        timestamp: alert.created_at || alert.timestamp || new Date().toISOString()
      };
      addAlert(formattedAlert);
      if (profile && (profile.role === 'admin' || profile.role === 'tanod')) {
        toast.error(`NEW SOS ALERT: ${formattedAlert.type}`, { duration: 10000 });
        // Trigger browser notification for critical roles
        if (formattedAlert.status === 'pending') {
          showSOSNotification(formattedAlert);
        }
      }
      if (profile && profile.role === 'resident' && formattedAlert.residentId === profile.id) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200);
        }
        toast.success(`SOS Update: ${formattedAlert.status}`);
      }
    });

    socket.on('patrol_update', (update: any) => {
       const patrol: PatrolLocation = {
         id: update.tanodId || update.tanod_id,
         tanodId: update.tanodId || update.tanod_id,
         tanodName: update.tanodName || update.tanod_name || 'Active Tanod',
         location: typeof update.location === 'string' ? JSON.parse(update.location) : update.location,
         isActive: update.isActive ?? update.is_active,
         status: (update.isActive ?? update.is_active) ? (update.status || 'patrolling') : 'offline',
         lastUpdate: new Date().toISOString()
       };
       
       updatePatrol(patrol);
    });

    socket.on('patrol_location', (data: any) => {
      updatePatrol({
        tanodId: data.tanodId,
        isActive: true,
        ...data
      } as PatrolLocation);
    });

    socket.on('broadcast_update', (broadcast: any) => {
      if (broadcast.isActive) {
        setActiveBroadcast(broadcast);
      } else {
        setActiveBroadcast(null);
      }
    });

    socket.on('tanod_update', (update: any) => {
      if (update.status) {
        updateTanodStatus(update.id, update.status);
      }
    });

    return () => {
      socket.off('alert_update');
      socket.off('patrol_update');
      socket.off('patrol_location');
      socket.off('broadcast_update');
      socket.off('tanod_update');
    };
  }, [profile, setAlerts, setPatrols]);

  const [isSettingRole, setIsSettingRole] = useState(false);
  const handleSetRole = async (role: UserRole) => {
    if (!user) return;
    setIsSettingRole(true);
    try {
       // Roles are handled by DB update
       await api.generic.update(`users/${user.id}`, { role, status: 'approved' });
       // Re-fetch profile
       const updated = await api.auth.getProfile(user.id);
       setProfile(updated);
       localStorage.setItem('user', JSON.stringify(updated));
    } catch (err: any) {
      console.error("Role assignment failure:", err);
      toast.error(`System Error: ${err.message}`);
    } finally {
      setIsSettingRole(false);
    }
  };

  const handleDemoLogin = async (role: 'resident' | 'admin') => {
    try {
      setLoading(true);
      toast.loading("Initiating anonymous session...", { id: 'demo-login' });
      const res = await api.auth.login({ 
        email: role === 'admin' ? 'admin@demo.com' : 'resident@demo.com', 
        password: 'demo' 
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setProfile(res.user);
      toast.success("Guest Session Active", { id: 'demo-login' });
    } catch (err: any) {
      console.error("Demo login failed:", err);
      toast.error(`DEMO MODE FAILED: ${err.message}`, { id: 'demo-login', duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
        <BackgroundPattern />
        <div className="relative mb-12">
           <div className="absolute inset-0 bg-emergency/20 blur-[100px] rounded-full animate-pulse" />
           <TanodLogo size={120} animated={true} className="relative z-10 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]" />
        </div>
        <div className="space-y-4 relative z-10">
          <h2 className="text-2xl font-black italic tracking-tighter text-white font-mono uppercase leading-none">Initializing Link</h2>
          <div className="flex gap-1 justify-center">
            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 bg-emergency rounded-full" />
            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-emergency rounded-full" />
            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-emergency rounded-full" />
          </div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] font-mono mt-4">Establishing Secure Command Connection</p>
        </div>
      </div>
    );
  }

  // Handle Registration
  if (isRegistering) return (
    <RegistrationForm 
      onCancel={() => setIsRegistering(false)} 
      onComplete={async (data: any) => {
        try {
          const res = await api.auth.register(data);
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          setUser(res.user);
          setProfile(res.user);
          setIsRegistering(false);
        } catch (err: any) {
          toast.error(err.message);
        }
      }} 
    />
  );

  if (!user) return (
    <LoginView 
      onLogin={handleLogin} 
      onRegister={() => setIsRegistering(true)} 
      isLoggingIn={isLoggingIn} 
      onDemoLogin={() => handleDemoLogin('resident')}
      onDemoAdminLogin={() => handleDemoLogin('admin')}
      deferredPrompt={deferredPrompt}
      onInstall={handleInstallApp}
      onResetSession={resetAuthSession}
    />
  );

  if (user && !profile && !residentProfile) return (
    <RoleSelection 
      onSelect={handleSetRole} 
      onRegister={() => setIsRegistering(true)} 
      isSettingRole={isSettingRole}
      deferredPrompt={deferredPrompt}
      onInstall={handleInstallApp}
    />
  );

  if (effectiveRole === 'resident' && profile && !viewOverride) {
    if (profile.status === 'pending') return <PendingApproval user={user} deferredPrompt={deferredPrompt} onInstall={handleInstallApp} onLogout={handleLogout} />;
    if (profile.status === 'rejected') return <RejectedScreen reason={residentProfile?.rejectionReason || 'Documents verification failed.'} deferredPrompt={deferredPrompt} onInstall={handleInstallApp} onLogout={handleLogout} />;
  }

  const items = navItems.filter(item => {
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') return true;
    if (effectiveRole === 'tanod') return !['residents', 'settings', 'logs'].includes(item.id);
    return ['home', 'map', 'tracker', 'directory', 'settings'].includes(item.id);
  });

  return (
    <div className="min-h-screen bg-brand-bg text-white font-sans flex flex-col md:flex-row h-screen overflow-hidden relative">
      <div className="fixed top-0 left-0 w-full z-[101] pointer-events-none h-8 overflow-hidden">
        <div 
          className={cn(
            "absolute top-0 left-0 w-full px-4 py-1.5 text-center text-[7px] xs:text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer pointer-events-auto", 
            isOnline ? "bg-green-500/10 text-green-400 border-b border-green-500/20" : "bg-emergency/20 text-emergency border-b border-emergency/30 backdrop-blur-md animate-pulse"
          )} 
          onClick={(e) => { e.stopPropagation(); setIsOnline(!isOnline); }}
        >
          <span className="inline-block animate-flicker">
            {isOnline ? "System Online — Neural Sync Active" : "Offline Mode — Operating on Local Storage"}
          </span>
        </div>
      </div>
      <Toaster />

      <BroadcastOverlay 
        activeBroadcast={activeBroadcast}
        effectiveRole={effectiveRole}
        alerts={alerts}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
      />

      <BackgroundPattern />
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.02] select-none">
        <TanodLogo size={800} animated={false} useImage={false} className="grayscale contrast-150 rotate-[-15deg] blur-[2px]" />
      </div>

      <div className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/5 shrink-0 z-[60] shadow-command mt-8">
        <div className="flex items-center gap-2">
          <TanodLogo size={32} animated={false} useImage={false} />
          <div className="flex flex-col">
            <span className="font-black italic tracking-tighter text-sm xs:text-base uppercase font-mono text-white leading-none">Brgy.TANOD <span className="text-emergency">🆘</span></span>
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest font-mono">TACTICAL GRID</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button 
              onClick={handleInstallApp}
              className="p-3 text-info hover:text-white transition-colors bg-info/10 rounded-2xl border border-info/20 active:scale-95"
              title="Install App"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 text-white/40 hover:text-white transition-colors bg-white/5 rounded-2xl border border-white/5 active:scale-90"
          >
            {isMobileMenuOpen ? (
              <XIcon className="w-6 h-6" />
            ) : (
              <div className="flex flex-col gap-1.5 w-6">
                <span className="w-full h-0.5 bg-white/40 rounded-full" />
                <span className="w-full h-0.5 bg-white/40 rounded-full" />
                <span className="w-full h-0.5 bg-white/40 rounded-full" />
              </div>
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-brand-bg/80 backdrop-blur-md z-[55]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <WitnessOverlay userId={profile?.id || ''} />

      <NavigationSidebar 
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        effectiveRole={effectiveRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={user}
        profile={profile}
        handleLogout={handleLogout}
        deferredPrompt={deferredPrompt}
        handleInstallApp={handleInstallApp}
      />

      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 flex flex-col">
        <header className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-8 shrink-0 relative z-10 w-full glass-panel p-4 md:p-6 rounded-[32px] shadow-command">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start w-full transition-all">
              <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase font-mono text-white">
                {activeTab}
              </h1>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black tracking-widest text-emergency uppercase mt-1">
                  {effectiveRole === 'resident' && "Resident view panel"}
                  {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && "Admin view panel"}
                  {effectiveRole === 'tanod' && "Tanod view panel"}
                </span>
                <span className="text-[8px] font-mono text-white/40 uppercase tracking-[0.2em]">SECURE SYSTEM v2.4.0</span>
              </div>
            </div>
            <p className="text-white/40 text-[10px] font-bold tracking-[0.1em] uppercase mt-1 font-mono">
              Brgy.TANOD 🆘 ALERT — EMERGENCY INTELLIGENCE INFRASTRUCTURE
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            {(isMasterAdmin || checkIsRuben(user?.id, user?.email || undefined)) && (
              <div className="flex bg-brand-bg/50 border border-white/10 rounded-2xl overflow-hidden p-1">
                <button 
                  onClick={() => { setViewOverride(null); setActiveTab('home'); }} 
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all", !viewOverride ? "bg-emergency text-white shadow-glow-red" : "text-white/40 hover:text-white")}
                >
                  ADMIN
                </button>
                <button 
                  onClick={() => { setViewOverride('tanod'); setActiveTab('home'); }} 
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all", viewOverride === 'tanod' ? "bg-emergency text-white shadow-glow-red" : "text-white/40 hover:text-white")}
                >
                  TANOD VIEW
                </button>
                <button 
                  onClick={() => { setViewOverride('resident'); setActiveTab('home'); }} 
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all", viewOverride === 'resident' ? "bg-emergency text-white shadow-glow-red" : "text-white/40 hover:text-white")}
                >
                  CLIENT VIEW
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleGlobalSiren}
                className={cn(
                  "p-3 rounded-2xl border transition-all group relative",
                  globalSirenActive 
                    ? "bg-emergency border-white/20 text-white animate-pulse shadow-glow-red" 
                    : "bg-brand-card border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                )}
                title={globalSirenActive ? "Stop Global Emergency Broadcast" : "Activate Global Siren"}
              >
                {globalSirenActive ? <VolumeX className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <Volume2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              </button>

              {(effectiveRole === 'tanod' || effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
                <button 
                  onClick={() => setIsIncidentFormOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emergency rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-glow-red font-black text-xs tracking-widest"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" /> NEW INCIDENT
                </button>
              )}
              
              <button className="p-3 bg-brand-card border border-white/10 rounded-2xl hover:bg-brand-card/80 relative transition-all group">
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {alerts.filter(a => a.status !== 'resolved' && a.status !== 'cancelled').length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emergency border-2 border-brand-bg rounded-full animate-ping"></span>}
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab} 
            initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }} 
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} 
            exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }} 
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} 
            className="flex-1"
          >
            {activeTab === 'home' && effectiveProfile && (
              <DashboardView 
                profile={effectiveProfile} 
                alerts={alerts} 
                patrols={patrols} 
                onTabChange={(tab: any) => setActiveTab(tab as any)} 
                isOnline={isOnline} 
                deferredPrompt={deferredPrompt}
                onInstall={handleInstallApp}
                sirenActive={globalSirenActive}
                onToggleSiren={toggleGlobalSiren}
                visiblePatrols={visiblePatrols}
                activeBroadcast={activeBroadcast}
              />
            )}
            {activeTab === 'map' && (
              <div className="h-full min-h-[500px] flex flex-col gap-4">
                <div className="bg-[#16191F] p-4 rounded-xl border border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold font-mono uppercase">Offline Area Map</h3>
                    <p className="text-xs text-[#8E9299]">Fallback view for network issues / area intelligence</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-black tracking-widest text-[#8E9299]">
                    <div className="flex items-center gap-2"><span className="text-base">🔴</span> SOS</div>
                    <div className="flex items-center gap-2"><span className="text-base">🟢</span> PATROL</div>
                  </div>
                </div>
                <ActiveMap alerts={alerts} patrols={visiblePatrols} />
              </div>
            )}
            {activeTab === 'tracker' && (
              <div className="h-full min-h-[500px] flex flex-col gap-4">
                <div className="bg-[#16191F] p-4 rounded-xl border border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold font-mono uppercase">Tactical Live GPS</h3>
                    <p className="text-xs text-[#8E9299]">Real-time Tanod-to-Citizen streaming via WebSockets/Firebase</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-black tracking-widest text-[#8E9299]">
                    <div className="flex items-center gap-2"><span className="text-base">🔴</span> RESIDENT SOS</div>
                    <div className="flex items-center gap-2"><span className="text-base">🟢</span> TANOD ON DUTY</div>
                  </div>
                </div>
                <LiveMap />
              </div>
            )}
            {activeTab === 'residents' && (effectiveRole === 'admin' || effectiveRole === 'superadmin') && effectiveProfile && <AdminResidents profile={effectiveProfile} />}
            {activeTab === 'resident-map' && (effectiveRole === 'admin' || effectiveRole === 'superadmin') && <ResidentTacticalMap />}
            {activeTab === 'directory' && <DirectoryView />}
            {activeTab === 'schedule' && effectiveProfile && <ScheduleView profile={effectiveProfile} role={effectiveRole as any} />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && effectiveProfile && <SettingsView profile={effectiveProfile} role={effectiveRole as any} />}
            {activeTab === 'roster' && <TanodRosterView />}
            {activeTab === 'logs' && (effectiveRole === 'admin' || effectiveRole === 'superadmin') && <TanodActivityLogs />}
          </motion.div>
        </AnimatePresence>

        {isIncidentFormOpen && effectiveProfile && (
          <IncidentForm profile={effectiveProfile} onClose={() => setIsIncidentFormOpen(false)} />
        )}
        {effectiveProfile && effectiveRole === 'tanod' && <TanodCommandAlert profile={effectiveProfile} isTestMode={viewOverride === 'tanod'} />}
        
        <SirenController 
          globalSirenActive={globalSirenActive} 
          profile={effectiveProfile} 
          alerts={alerts} 
        />
        <BackgroundServices />
      </main>
    </div>
  );
}




