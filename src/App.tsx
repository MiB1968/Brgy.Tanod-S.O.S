/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  getRedirectResult,
  browserSessionPersistence,
  signInWithRedirect,
  indexedDBLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  limit,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  User, 
  Alert, 
  UserRole, 
  PatrolLocation, 
  SystemBroadcast,
  EmergencyType,
  ResidentProfile
} from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
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
import LiveMap from './components/ReportMap';
import { useAuthStore } from './store/useAuthStore';
import { useIncidentStore } from './store/useIncidentStore';
import { useTanodStore } from './store/useTanodStore';
import { useSystemStore } from './store/useSystemStore';
import { useSOSStore } from './store/useSOSStore';

// Service & Lib imports
import { analyzeIncident } from './services/aiService';
import { getQueueSize } from './lib/offlineQueue';
import { cn } from './lib/utils';
import { isSupabaseConfigured, supabase } from './lib/supabase';
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
  const { alerts, setAlerts } = useIncidentStore();
  const { patrols, setPatrols } = useTanodStore();
  const { 
    isOnline, 
    setIsOnline, 
    queuedSOSCount, 
    setQueuedSOSCount, 
    triggerSync 
  } = useSystemStore();
  const { subscribeToUserAlerts } = useSOSStore();
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
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

  // Connection status management
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // PWA installation handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('System Linked Locally', { icon: '📲' });
      }
      setDeferredPrompt(null);
    }
  };

  const isMasterAdminEmail = useMemo(() => {
    return user?.email === 'rubenlleg12@gmail.com' || user?.email === 'ronniecantuba420@gmail.com';
  }, [user?.email]);
  
  const baseRole = useMemo(() => {
    if (isMasterAdminEmail) return 'superadmin';
    return profile?.role || 'guest';
  }, [isMasterAdminEmail, profile?.role]);

  const effectiveRole = viewOverride || baseRole;

  const effectiveProfile = useMemo(() => {
    if (!profile && !user) return null;
    const p = profile || { uid: user?.uid, name: user?.displayName, email: user?.email } as User;
    return { 
      ...p, 
      role: effectiveRole as UserRole,
      name: checkIsRuben(user?.uid) ? `${p.name} (SuperAdmin)` : p.name
    } as User;
  }, [profile, effectiveRole, user]);

  const visiblePatrols = useMemo(() => {
    return patrols.filter(p => {
      if (['admin', 'superadmin', 'tanod'].includes(effectiveRole)) {
        return p.isActive && (Date.now() - new Date(p.lastUpdate).getTime() < PATROL_TIMEOUT);
      }
      if (effectiveRole === 'resident' && profile) {
        return alerts.some(a => 
          a.residentId === profile.uid && 
          (a.status === 'pending' || a.status === 'responding') && 
          a.assignedTo === p.tanodId
        );
      }
      return false;
    });
  }, [patrols, effectiveRole, profile, alerts]);

  // Global Data Listeners
  useEffect(() => {
    if (!db || !user) return;

    // Listen for all alerts (if admin/tanod) or just relevant ones
    const alertsQuery = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'alerts'));

    // Listen for patrols
    const patrolsQuery = collection(db, 'patrols');
    const unsubPatrols = onSnapshot(patrolsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatrolLocation));
      setPatrols(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patrols'));

    return () => {
      unsubAlerts();
      unsubPatrols();
    };
  }, [user, db, setAlerts, setPatrols]);

  // SOS Store Subscription
  useEffect(() => {
    if (user?.uid && effectiveRole === 'resident') {
      const unsubscribe = subscribeToUserAlerts(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, effectiveRole, subscribeToUserAlerts]);

  // Global Siren Sync
  useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(doc(db, 'system', 'siren'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const active = data?.sirenActive || false;
        setGlobalSirenActive(active);
        if (active) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 2000);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'system/siren'));
  }, [user]);

  const toggleGlobalSiren = async () => {
    if (!db) return;
    try {
      const nextState = !globalSirenActive;
      await setDoc(doc(db, 'system', 'siren'), {
        sirenActive: nextState,
        sirenTriggeredBy: profile?.name || 'System',
        sirenTriggeredAt: new Date().toISOString()
      }, { merge: true });
      
      toast.success(nextState ? 'GLOBAL SIREN BROADCAST ACTIVE' : 'Global Siren Off', { 
        icon: nextState ? '📢' : '🔇',
        style: nextState ? { background: '#FF4B4B', color: '#fff' } : {}
      });
    } catch (err) {
      console.error(err);
      toast.error('Siren Control System Failure');
    }
  };

  // Broadcast Listener
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'system_broadcasts'), 
      where('isActive', '==', true), 
      orderBy('timestamp', 'desc'), 
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const broadcast = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SystemBroadcast;
        setActiveBroadcast(broadcast);
        if (!globalSirenActive) setGlobalSirenActive(true);
      } else {
        setActiveBroadcast(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'system_broadcasts'));
  }, []);

  // Failsafe Loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  // Auth Sync
  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AUTH_STATE_REPORT:", { 
        loggedIn: !!firebaseUser, 
        uid: firebaseUser?.uid, 
        email: firebaseUser?.email,
        timestamp: new Date().toISOString()
      });

      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          if (!loading) setLoading(true);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as User);
          } else if (checkIsRuben(firebaseUser.uid) || firebaseUser.email === 'rubenlleg12@gmail.com') {
            const adminProfile: User = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Ruben Llego',
              email: firebaseUser.email || 'rubenlleg12@gmail.com',
              role: 'superadmin',
              createdAt: new Date().toISOString(),
              status: 'approved'
            } as User;
            await setDoc(doc(db, 'users', firebaseUser.uid), adminProfile);
            setProfile(adminProfile);
          }

          const resDoc = await getDoc(doc(db, 'residents', firebaseUser.uid));
          if (resDoc.exists()) {
            setResidentProfile({ id: resDoc.id, ...resDoc.data() } as ResidentProfile);
          }
        } catch (err) {
          console.error("Profile sync error:", err);
          toast.error("DATA_SYNC_ERROR: Profile retrieval failed.");
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setResidentProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [auth, db, setLoading, setProfile, setResidentProfile]);

  // Handle Redirect Result explicitly - DISABLED to prevent missing initial state error in restricted environments.
  useEffect(() => {
    console.log("REDIRECT_AUTH_FLOW_DISABLED");
  }, []); // Run ONCE at app load

  const handleLogin = async () => {
    if (isLoggingIn || !auth) return;
    
    const isIframe = window.self !== window.top;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIncognito = !window.indexedDB; // Crude check for some browsers

      // Force REDIRECT for mobile environments that are known to struggle with popups (e.g. webviews, or if requested)
      // Android Chrome generally supports popups well.
      if (isIframe) {
        toast.error('AUTHENTICATION_ERROR: Iframe context detected. Please open this app in a NEW TAB to authenticate.', { 
          duration: 8000,
          style: { background: '#FF4B4B', color: '#fff' }
        });
        return;
      }

      try {
        setIsLoggingIn(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        await signInWithPopup(auth, provider);
        // Note: setUser will be called via onAuthStateChanged, not here
        toast.success(`Access Granted`, { icon: '🔑' });
      } catch (err: any) {
        console.error("AUTH_FAULT:", err);
        
        if (err.code === 'auth/unauthorized-domain') {
          toast.error(`SECURITY: Unauthorized Host. Contact Admin.`, { duration: 10000 });
        } else if (err.code === 'auth/popup-blocked') {
          toast.error("AUTH ISSUE: Redirect/Popups Blocked. Please tap the button again or allow popups in your browser settings.", { duration: 10000 });
        } else if (err.code === 'auth/network-request-failed') {
          toast.error('NETWORK ERROR: Connection unstable. Check your signal.');
        } else if (err.code !== 'auth/popup-closed-by-user') {
          toast.error(`AUTH ERROR: ${err.message}`);
        }
      } finally {
        setIsLoggingIn(false);
      }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setResidentProfile(null);
      setActiveTab('home');
      toast.success("SESSION_TERMINATED: Unit logged out.");
    } catch (err) {
      console.error("Logout failure:", err);
    }
  };

  const [isSettingRole, setIsSettingRole] = useState(false);
  const handleSetRole = async (role: UserRole) => {
    if (!user || !db) return;
    setIsSettingRole(true);
    try {
      const newProfile: Partial<User> = {
        uid: user.uid,
        name: user.displayName || 'Citizen',
        email: user.email || '',
        role: role,
        createdAt: new Date().toISOString(),
        status: role === 'resident' ? 'pending' : 'approved',
        lastActive: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile as User);
    } catch (err) {
      console.error("Role assignment failure:", err);
      toast.error("Security System: Role Assignment Failed");
    } finally {
      setIsSettingRole(false);
    }
  };

  const handleDemoLogin = (role: 'resident' | 'admin') => {
    const uid = role === 'resident' ? 'demo_resident_uid' : 'anonymous_admin_demo';
    const mockUser = { uid, displayName: `Demo ${role}`, email: `${role}@demo.com` } as FirebaseUser;
    setUser(mockUser);
    setProfile({ 
      uid, 
      id: uid, 
      name: mockUser.displayName!, 
      email: mockUser.email!, 
      role: role === 'resident' ? 'resident' : 'superadmin',
      status: 'approved',
      createdAt: new Date().toISOString()
    } as User);
    setLoading(false);
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

  if (isRegistering) return <RegistrationForm onCancel={() => setIsRegistering(false)} onComplete={() => { setIsRegistering(false); window.location.reload(); }} />;

  if (!user) return (
    <LoginView 
      onLogin={handleLogin} 
      onRegister={() => setIsRegistering(true)} 
      isLoggingIn={isLoggingIn} 
      onDemoLogin={() => handleDemoLogin('resident')}
      onDemoAdminLogin={() => handleDemoLogin('admin')}
      deferredPrompt={deferredPrompt}
      onInstall={handleInstallApp}
      auth={auth}
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

      <WitnessOverlay userId={profile?.uid || ''} />

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
            {(isMasterAdminEmail || checkIsRuben(user?.uid)) && (
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
                <LiveMap lat={13.2236} lng={120.596} />
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




