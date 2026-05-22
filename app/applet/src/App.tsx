/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import socket from "./lib/socket";
import * as api from "./lib/api";
import {
  User,
  Alert,
  AlertStatus,
  UserRole,
  PatrolLocation,
  SystemBroadcast,
  EmergencyType,
  ResidentProfile,
} from "./types";
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
  WifiOff,
  Mic,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AdminDashboard from "./components/AdminDashboard";
import TanodDashboard from "./components/TanodDashboard";
import { BroadcastOverlay } from "./components/BroadcastOverlay";
import { NavigationSidebar } from "./components/NavigationSidebar";
import { WitnessOverlay } from "./components/WitnessOverlay";
import { Toaster, toast } from "react-hot-toast";
import { TanodLogo, BackgroundPattern } from "./components/Branding";
import TanodCommandAlert from "./components/TanodCommandAlert";
import SOSAlertSiren from "./components/SOSAlertSiren";
import BackgroundServices from "./components/BackgroundServices";
import SirenController from "./components/SirenController";
import DashboardView from "./components/DashboardView";
import ActiveMap from "./components/ActiveMap";
import AdminResidents from "./components/AdminResidents";
import DirectoryView from "./components/DirectoryView";
import ScheduleView from "./components/ScheduleView";
import ReportsView from "./components/ReportsView";
import DigitalRecordsView from "./components/DigitalRecordsView";
import SettingsView from "./components/SettingsView";
import TanodRosterView from "./components/TanodRosterView";
import { TanodActivityLogs } from "./components/Admin/TanodActivityLogs";
import { ResidentVerification } from "./components/Admin/ResidentVerification";
import EmergencyTestPanel from "./components/Test/EmergencyTestPanel";
import IncidentForm from "./components/IncidentForm";
import ResidentTacticalMap from "./components/Admin/ResidentTacticalMap";
import OpsIntegrations from "./components/Admin/OpsIntegrations";
import RegistrationForm from "./components/RegistrationForm";
import {
  LoginView,
  RoleSelection,
  PendingApproval,
  RejectedScreen,
} from "./components/AuthViews";
import LiveMap from "./LiveMap";
import { useAuthStore } from "./store/useAuthStore";
import { useIncidentStore } from "./store/useIncidentStore";
import { useTanodStore } from "./store/useTanodStore";
import { useSystemStore } from "./store/useSystemStore";
import { useSOSStore } from "./store/useSOSStore";
import * as safeStorage from "./lib/safeStorage";

// Service & Lib imports
import { workspaceAuth } from "./services/googleWorkspaceService";
import { useRBAC } from "./context/AuthContext";
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { useSocketListeners } from "./hooks/useSocketListeners";
import { useAudioInitializer } from "./hooks/useAudioInitializer";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";
import { GuardianGreeting } from "./components/ai/GuardianGreeting";
import { PWAStatus } from "./components/PWAStatus";

// Rest of App...
import { cn, isValidCoord } from "./lib/utils";
import {
  isRuben as checkIsRuben,
  PATROL_TIMEOUT,
  navItems,
  containerVariants,
} from "./constants";

export default function App() {
  useAudioInitializer();

  const { user: firebaseUser, role: rbacRole, loading: rbacLoading } = useRBAC();

  const {
    profile,
    setProfile,
    residentProfile,
    setResidentProfile,
    isLoading: loading,
    setIsLoading: setLoading,
  } = useAuthStore();
  const { alerts, setAlerts, addAlert } = useIncidentStore();
  const { patrols, setPatrols, setTanods, updateTanodStatus, updatePatrol } =
    useTanodStore();
  const {
    isOnline,
    setIsOnline,
    queuedSOSCount,
    setQueuedSOSCount,
    triggerSync,
  } = useSystemStore();
  const { subscribeToUserAlerts } = useSOSStore();

  const [user, setUser] = useState<any | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "map"
    | "tracker"
    | "reports"
    | "directory"
    | "schedule"
    | "residents"
    | "resident-map"
    | "roster"
    | "verification"
    | "simulator"
    | "settings"
    | "logs"
    | "records"
    | "ops"
  >("home");
  const [isIncidentFormOpen, setIsIncidentFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [viewOverride, setViewOverride] = useState<
    "admin" | "tanod" | "resident" | null
  >(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [globalSirenActive, setGlobalSirenActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeBroadcast, setActiveBroadcast] =
    useState<SystemBroadcast | null>(null);
  const [isTacticalVoiceOpen, setIsTacticalVoiceOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);

  const isMasterAdmin = useMemo(() => {
    return (
      checkIsRuben(user?.id, user?.email || undefined) ||
      user?.email === "ben@brgytanod.com" ||
      user?.email === "rubenlleg12@gmail.com"
    );
  }, [user?.id, user?.email]);

  // Super Admin Welcome Greeting
  useEffect(() => {
    if (!isMasterAdmin || !user) return;

    const playGreeting = async () => {
      try {
        const greetingKey = `super_admin_greeting_${user.id || user.email}`;

        // Check if greeting was already played
        if (localStorage.getItem(greetingKey)) {
          console.log("🎤 Super Admin greeting already played this session");
          return;
        }

        // Wait for audio system to be ready
        await new Promise((resolve) => setTimeout(resolve, 1300));

        const { EmergencySoundManager } =
          await import("./lib/EmergencySoundManager");
        const manager = EmergencySoundManager.getInstance();

        // Stop any ongoing speech
        speechSynthesis.cancel();

        // Play welcome message
        await manager.speakCustom(
          "Welcome Sir Ben. Full power is ready. Just say the word.",
          { lang: "en-US" },
        );

        // Mark as played
        localStorage.setItem(greetingKey, "true");

        console.log("🎤 Super Admin Voice Greeting Played");
      } catch (err) {
        console.warn("Greeting TTS failed", err);
      }
    };

    playGreeting();
  }, [isMasterAdmin, user]);

  const baseRole = useMemo(() => {
    if (isMasterAdmin) return "superadmin";
    return rbacRole || profile?.role || "guest";
  }, [isMasterAdmin, rbacRole, profile?.role]);

  const effectiveRole = viewOverride || baseRole;

  const effectiveProfile = useMemo(() => {
    if (!profile && !user) return null;
    const p =
      profile ||
      ({ id: user?.id, name: user?.name, email: user?.email } as User);
    return {
      ...p,
      role: effectiveRole as UserRole,
      name: checkIsRuben(user?.id, user?.email || undefined)
        ? `${p.name} (SuperAdmin)`
        : p.name,
    } as User;
  }, [profile, effectiveRole, user]);

  // Custom hooks for real-time listeners
  useSocketListeners(
    effectiveProfile,
    effectiveRole,
    setActiveBroadcast,
    setGlobalSirenActive,
    setIsShaking,
    setActiveTab,
  );

  const visiblePatrols = useMemo(() => {
    return (patrols || []).filter((p) => {
      // Basic coordinates check - ensure p.location is an object
      if (
        !p ||
        !p.location ||
        typeof p.location !== "object" ||
        !isValidCoord(p.location.lat, p.location.lng)
      )
        return false;

      if (["admin", "superadmin", "tanod"].includes(effectiveRole)) {
        // For staff, show all who are marked active OR have pinged recently
        const isRecentlyActive = p.lastUpdate
          ? Date.now() - new Date(p.lastUpdate).getTime() < PATROL_TIMEOUT
          : false;
        return p.isActive || isRecentlyActive;
      }
      if (effectiveRole === "resident" && profile) {
        // Residents only see Tanods assigned to them
        return alerts.some(
          (a) =>
            a.residentId === profile.id &&
            (a.status === "pending" || a.status === "responding") &&
            a.assignedTo === p.tanodId,
        );
      }
      return false;
    });
  }, [patrols, effectiveRole, profile, alerts]);

  // Authentication persistence
  useEffect(() => {
    // Standard Auth
    const token = safeStorage.getItem("token");
    const storedUser = safeStorage.getItem("user");
    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        setProfile(u);
      } catch (err) {
        console.error("Malformed user data in storage", err);
        safeStorage.removeItem("user");
        safeStorage.removeItem("token");
      }
    }

    // Workspace Auth Init
    workspaceAuth.init(
      (user, token) => {
        setWorkspaceToken(token);
        setGoogleUser(user);
      },
      () => {
        setWorkspaceToken(null);
        setGoogleUser(null);
      }
    );

    setLoading(false);
  }, [setProfile, setLoading]);

  // Initial Load of Data (Removed - now in useAppData hook)

  // SOS Store Subscription
  useEffect(() => {
    if (user?.id && effectiveRole === "resident") {
      const unsubscribe = subscribeToUserAlerts(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, effectiveRole, subscribeToUserAlerts]);

  // Global Siren Sync (Removed - now in useSocketListeners hook)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync(); // Flush queue
      toast.success("Connection Restored: Syncing Incident Log...");
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline, triggerSync]);

  const toggleGlobalSiren = useCallback(async () => {
    try {
      const nextState = !globalSirenActive;
      await api.system.updateSiren({
        sirenActive: nextState,
        sirenTriggeredBy: profile?.name || "System",
        sirenTriggeredAt: new Date().toISOString(),
      });

      toast.success(
        nextState ? "GLOBAL SIREN BROADCAST ACTIVE" : "Global Siren Off",
        {
          icon: nextState ? "📢" : "🔇",
          style: nextState ? { background: "#FF4B4B", color: "#fff" } : {},
        },
      );
    } catch (err) {
      console.error(err);
      toast.error("Siren Control System Failure");
    }
  }, [globalSirenActive, profile?.name]);

  // Failsafe Loading
  const loadingFailsafeTriggered = useRef(false);
  useEffect(() => {
    if (loadingFailsafeTriggered.current) return;
    const timer = setTimeout(() => {
      setLoading(false);
      loadingFailsafeTriggered.current = true;
    }, 8000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  const handleLogin = useCallback(
    async (email?: string, password?: string) => {
      if (isLoggingIn) return;
      setIsLoggingIn(true);

      try {
        if (email && password) {
          // Use Firebase Authentication directly
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          const token = await firebaseUser.getIdToken();
          
          safeStorage.setItem("token", token);
          
          // Construct basic profile, actual role tracking is handled by AuthContext
          const localProfile: User = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'System User',
            email: firebaseUser.email || '',
            role: 'resident', // Default fallback, AuthContext will overwrite
            status: 'approved',
            createdAt: new Date().toISOString()
          };
          
          safeStorage.setItem("user", JSON.stringify(localProfile));
          setUser(localProfile);
          setProfile(localProfile);
          
          toast.success(`Unit Authenticated`, { icon: "🔑" });
        }
      } catch (err: any) {
        console.error("AUTH_FAULT:", err);
        let errorMsg = err.message;
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          errorMsg = "INVALID IDENTIFICATION PROTOCOL";
        }
        toast.error(`AUTH FAILURE: ${errorMsg}`);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [isLoggingIn, setProfile],
  );

  const handleGoogleLogin = useCallback(async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await workspaceAuth.signIn();
      if (result) {
        setWorkspaceToken(result.accessToken);
        setGoogleUser(result.user);

        const firebaseUser = result.user;
        const token = await firebaseUser.getIdToken();
        
        // Ensure user exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userRole = 'resident';
        let userStatus = 'approved';
        
        try {
          const userSnap = await setDoc(userRef, {
             email: firebaseUser.email,
             name: firebaseUser.displayName,
             // Note: if doc already exists, merge: true preserves existing role/status
             role: userRole,
             status: userStatus,
          }, { merge: true });
        } catch (e: any) {
             console.warn("Firestore sync failed, proceeding locally.");
        }

        safeStorage.setItem('token', token);
        
        const localProfile: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email || '',
          role: userRole as any,
          status: userStatus as any,
          createdAt: new Date().toISOString()
        };
        safeStorage.setItem('user', JSON.stringify(localProfile));
        setUser(localProfile);
        setProfile(localProfile);

        toast.success('Workspace Connected', { icon: '🌐' });
      }
    } catch (err: any) {
      toast.error(`Workspace Auth Error: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn, setProfile]);

  const handleLogout = useCallback(async () => {
    safeStorage.removeItem("token");
    safeStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    await workspaceAuth.logout();
    setWorkspaceToken(null);
    setGoogleUser(null);
  }, [setProfile]);

  const handleInstallApp = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const resetAuthSession = useCallback(async () => {
    await handleLogout();
  }, [handleLogout]);

  useEffect(() => {
    const onAuthExpired = () => {
      console.warn('Authentication expired. Redirecting to login.');
      toast.error('Session expired. Please log in again.');
      handleLogout();
    };
    window.addEventListener('auth-expired', onAuthExpired);
    return () => window.removeEventListener('auth-expired', onAuthExpired);
  }, [handleLogout]);

  // Socket Listeners for Real-time Updates (Removed - now in useSocketListeners hook)

  const [isSettingRole, setIsSettingRole] = useState(false);
  const handleSetRole = useCallback(
    async (role: UserRole) => {
      if (!user) return;
      setIsSettingRole(true);
      try {
        // Roles are handled by DB update
        await api.generic.update(`users/${user.id}`, {
          role,
          status: "approved",
        });
        // Re-fetch profile
        const updated = await api.auth.getProfile(user.id);
        setProfile(updated);
        safeStorage.setItem("user", JSON.stringify(updated));
      } catch (err: any) {
        console.error("Role assignment failure:", err);
        toast.error(`System Error: ${err.message}`);
      } finally {
        setIsSettingRole(false);
      }
    },
    [user, setProfile],
  );

  const handleDemoLogin = useCallback(
    async (role: "resident" | "admin") => {
      try {
        setLoading(true);
        toast.loading("Initiating anonymous session...", { id: "demo-login" });
        const demoEmail = role === "admin" ? "admin@demo.com" : "resident@demo.com";
        const password = "password123!"; // More secure default
        
        let firebaseUser;
        try {
          const cred = await signInWithEmailAndPassword(auth, demoEmail, password);
          firebaseUser = cred.user;
        } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
             // Create it on the fly
             const cred = await createUserWithEmailAndPassword(auth, demoEmail, password);
             firebaseUser = cred.user;
             const name = role === 'admin' ? 'Demo Admin' : 'Demo Resident';
             await updateProfile(firebaseUser, { displayName: name });
             await setDoc(doc(db, "users", firebaseUser.uid), {
                email: demoEmail,
                name: name,
                role: role,
                status: 'approved',
                createdAt: serverTimestamp()
             });
          } else {
            throw e;
          }
        }
        
        const token = await firebaseUser.getIdToken();
        safeStorage.setItem("token", token);
        
        const localProfile: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (role === 'admin' ? 'Demo Admin' : 'Demo Resident'),
          email: firebaseUser.email || '',
          role: role as any,
          status: 'approved',
          createdAt: new Date().toISOString()
        };
        
        safeStorage.setItem("user", JSON.stringify(localProfile));
        setUser(localProfile);
        setProfile(localProfile);
        toast.success("Guest Session Active", { id: "demo-login" });
      } catch (err: any) {
        console.error("Demo login failed:", err);
        toast.error(`DEMO MODE FAILED: ${err.message}`, {
          id: "demo-login",
          duration: 8000,
        });
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setProfile],
  );

  if (loading || rbacLoading) {
    return (
      <GlobalErrorBoundary>
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
          <BackgroundPattern />
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-emergency/20 blur-[100px] rounded-full animate-pulse" />
            <TanodLogo
              size={120}
              animated={true}
              className="relative z-10 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            />
          </div>
          <div className="space-y-4 relative z-10">
            <h2 className="text-2xl font-black italic tracking-tighter text-white font-mono uppercase leading-none">
              Initializing Link
            </h2>
            <div className="flex gap-1 justify-center">
              <motion.div
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-2 h-2 bg-emergency rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-2 h-2 bg-emergency rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-2 h-2 bg-emergency rounded-full"
              />
            </div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] font-mono mt-4">
              Establishing Secure Command Connection
            </p>
          </div>
        </div>
      </GlobalErrorBoundary>
    );
  }

  // Handle Registration
  if (isRegistering)
    return (
      <GlobalErrorBoundary>
        <RegistrationForm
          onCancel={() => setIsRegistering(false)}
          onComplete={async (data: any) => {
            try {
              toast.loading("Encrypting profile matrix...", { id: 'reg' });
              const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
              const userRef = userCredential.user;
              await updateProfile(userRef, { displayName: data.name });
              
              const token = await userRef.getIdToken();
              safeStorage.setItem("token", token);
              
              // Prepare user profile data
              const userRole = (data.role === 'tanod' ? 'tanod' : 'resident');
              
              const localProfile: User = {
                id: userRef.uid,
                uid: userRef.uid,
                email: userRef.email || '',
                name: data.name,
                role: userRole as any,
                status: 'pending', // pending approval
                createdAt: new Date().toISOString()
              };
              
              // Save to Firestore
              await setDoc(doc(db, "users", userRef.uid), {
                email: userRef.email,
                name: data.name,
                role: userRole,
                status: 'pending',
                profileSetupComplete: true,
                createdAt: serverTimestamp(),
                details: data.details || {}
              });
              
              safeStorage.setItem("user", JSON.stringify(localProfile));
              setUser(localProfile);
              setProfile(localProfile);
              setIsRegistering(false);
              toast.success("Registration Successful. Awaiting Clearance.", { id: 'reg' });
            } catch (err: any) {
              console.error("Registration Error", err);
              toast.error(`ERROR: ${err.message}`, { id: 'reg' });
            }
          }}
        />
      </GlobalErrorBoundary>
    );

  if (!user)
    return (
      <GlobalErrorBoundary>
        <LoginView
          onLogin={handleLogin}
          onRegister={() => setIsRegistering(true)}
          isLoggingIn={isLoggingIn}
          onDemoLogin={() => handleDemoLogin("resident")}
          onDemoAdminLogin={() => handleDemoLogin("admin")}
          onGoogleLogin={handleGoogleLogin}
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallApp}
          onResetSession={resetAuthSession}
        />
      </GlobalErrorBoundary>
    );

  if (user && !profile && !residentProfile)
    return (
      <GlobalErrorBoundary>
        <RoleSelection
          onSelect={handleSetRole}
          onRegister={() => setIsRegistering(true)}
          isSettingRole={isSettingRole}
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallApp}
        />
      </GlobalErrorBoundary>
    );

  if (effectiveRole === "resident" && profile && !viewOverride) {
    if (profile.status === "pending")
      return (
        <PendingApproval
          user={user}
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallApp}
          onLogout={handleLogout}
        />
      );
    if (profile.status === "rejected")
      return (
        <RejectedScreen
          reason={
            residentProfile?.rejectionReason || "Documents verification failed."
          }
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallApp}
          onLogout={handleLogout}
        />
      );
  }

  const items = navItems.filter((item) => {
    if (effectiveRole === "admin" || effectiveRole === "superadmin")
      return true;
    if (effectiveRole === "tanod")
      return !["residents", "settings", "logs", "records"].includes(item.id);
    return ["home", "map", "tracker", "directory", "settings", "ops"].includes(
      item.id,
    );
  });

  return (
    <GlobalErrorBoundary>
      <div className="min-h-screen bg-brand-bg text-white font-sans flex flex-col md:flex-row h-screen overflow-hidden relative">
        <div className="fixed top-0 left-0 w-full z-[101] pointer-events-none h-8 overflow-hidden">
          <div
            className={cn(
              "absolute top-0 left-0 w-full px-4 py-1.5 text-center text-[7px] xs:text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer pointer-events-auto",
              isOnline
                ? "bg-green-500/10 text-green-400 border-b border-green-500/20"
                : "bg-emergency/20 text-emergency border-b border-emergency/30 backdrop-blur-md animate-pulse",
            )}
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !isOnline;
              setIsOnline(nextState);
              if (nextState) triggerSync();
            }}
          >
            <span className="inline-block animate-flicker">
              {isOnline
                ? "System Online — Neural Sync Active"
                : "Offline Mode — Operating on Local Storage"}
            </span>
          </div>
        </div>
        <Toaster />
        <PWAStatus />

        <BroadcastOverlay
          activeBroadcast={activeBroadcast}
          effectiveRole={effectiveRole}
          alerts={alerts}
          setActiveTab={(tab: string) => setActiveTab(tab as any)}
        />

        <BackgroundPattern />
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.02] select-none">
          <TanodLogo
            size={800}
            animated={false}
            useImage={false}
            className="grayscale contrast-150 rotate-[-15deg] blur-[2px]"
          />
        </div>

        <div className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/5 shrink-0 z-[60] shadow-command mt-8">
          <div className="flex items-center gap-2">
            <TanodLogo size={32} animated={false} useImage={false} />
            <div className="flex flex-col">
              <span className="font-black italic tracking-tighter text-sm xs:text-base uppercase font-mono text-white leading-none">
                Brgy.TANOD <span className="text-emergency">🆘</span>
              </span>
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest font-mono">
                TACTICAL GRID
              </span>
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

        <WitnessOverlay userId={profile?.id || ""} />

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

        <main className="flex-1 h-full overflow-y-auto p-3 sm:p-5 md:p-8 flex flex-col relative">
          <GlobalErrorBoundary>
            <header className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 shrink-0 relative z-10 w-full glass-panel p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-command border-white/5">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start w-full transition-all">
                  <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-tighter uppercase font-mono text-white leading-none">
                      {activeTab}
                    </h1>
                    <span className="text-[7px] sm:text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1">
                      SECURE_SURVEILLANCE_v2.4.0
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emergency/10 border border-emergency/20">
                      <span className="w-1 h-1 rounded-full bg-emergency animate-ping" />
                      <span className="text-[8px] sm:text-[10px] font-black tracking-widest text-emergency uppercase leading-none">
                        {effectiveRole === "resident" && "RESIDENT_NODE"}
                        {(effectiveRole === "admin" ||
                          effectiveRole === "superadmin") &&
                          "ADMIN_COMMAND"}
                        {effectiveRole === "tanod" && "RESPONDER_UNIT"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-white/10 via-transparent to-transparent mt-3" />
              </div>
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                {isMasterAdmin && (
                  <div className="flex bg-brand-bg/50 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden p-0.5 sm:p-1">
                    <button
                      onClick={() => {
                        setViewOverride(null);
                        setActiveTab("home");
                      }}
                      className={cn(
                        "px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black tracking-widest transition-all",
                        !viewOverride
                          ? "bg-emergency text-white shadow-glow-red"
                          : "text-white/40 hover:text-white",
                      )}
                    >
                      ADM
                    </button>
                    <button
                      onClick={() => {
                        setViewOverride("tanod");
                        setActiveTab("home");
                      }}
                      className={cn(
                        "px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black tracking-widest transition-all",
                        viewOverride === "tanod"
                          ? "bg-emergency text-white shadow-glow-red"
                          : "text-white/40 hover:text-white",
                      )}
                    >
                      TND
                    </button>
                    <button
                      onClick={() => {
                        setViewOverride("resident");
                        setActiveTab("home");
                      }}
                      className={cn(
                        "px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black tracking-widest transition-all",
                        viewOverride === "resident"
                          ? "bg-emergency text-white shadow-glow-red"
                          : "text-white/40 hover:text-white",
                      )}
                    >
                      RES
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleGlobalSiren}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all group relative",
                      globalSirenActive
                        ? "bg-emergency border-white/20 text-white animate-pulse shadow-glow-red"
                        : "bg-brand-card border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20",
                    )}
                    title={
                      globalSirenActive
                        ? "Stop Global Emergency Broadcast"
                        : "Activate Global Siren"
                    }
                  >
                    {globalSirenActive ? (
                      <VolumeX className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Volume2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                  </button>

                  {(effectiveRole === "tanod" ||
                    effectiveRole === "admin" ||
                    effectiveRole === "superadmin") && (
                    <button
                      onClick={() => setIsIncidentFormOpen(true)}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emergency rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-glow-red font-black text-[10px] sm:text-xs tracking-widest"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3px]" />{" "}
                      <span>NEW_INCIDENT</span>
                    </button>
                  )}

                  <button className="p-2.5 sm:p-3 bg-brand-card border border-white/10 rounded-xl sm:rounded-2xl hover:bg-brand-card/80 relative transition-all group">
                    <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {alerts.filter(
                      (a) =>
                        a.status !== "resolved" && a.status !== "cancelled",
                    ).length > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emergency border-2 border-brand-bg rounded-full animate-ping"></span>
                    )}
                  </button>
                </div>
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1"
              >
                {activeTab === "home" && effectiveProfile && (
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
                {activeTab === "map" && (
                  <div className="h-full min-h-[500px] flex flex-col gap-4">
                    <div className="bg-[#16191F] p-4 rounded-xl border border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold font-mono uppercase">
                          Offline Area Map
                        </h3>
                        <p className="text-xs text-[#8E9299]">
                          Fallback view for network issues / area intelligence
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-black tracking-widest text-[#8E9299]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔴</span> SOS
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🟢</span> PATROL
                        </div>
                      </div>
                    </div>
                    <ActiveMap alerts={alerts} patrols={visiblePatrols} />
                  </div>
                )}
                {activeTab === "tracker" && (
                  <div className="h-full min-h-[500px] flex flex-col gap-4">
                    <div className="bg-[#16191F] p-4 rounded-xl border border-[#2D3139] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold font-mono uppercase">
                          Tactical Live GPS
                        </h3>
                        <p className="text-xs text-[#8E9299]">
                          Real-time Tanod-to-Citizen streaming via
                          WebSockets/Firebase
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-black tracking-widest text-[#8E9299]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔴</span> RESIDENT SOS
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🟢</span> TANOD ON DUTY
                        </div>
                      </div>
                    </div>
                    <LiveMap effectiveRole={effectiveRole} />
                  </div>
                )}
                {activeTab === "residents" &&
                  (effectiveRole === "admin" ||
                    effectiveRole === "superadmin") &&
                  effectiveProfile && (
                    <AdminResidents profile={effectiveProfile} />
                  )}
                {activeTab === "verification" &&
                  (effectiveRole === "admin" ||
                    effectiveRole === "superadmin") &&
                  effectiveProfile && (
                    <div className="glass-panel p-4 md:p-8 rounded-[40px] border-white/5 h-full overflow-y-auto">
                      <ResidentVerification />
                    </div>
                  )}
                {activeTab === "simulator" &&
                  (effectiveRole === "admin" ||
                    effectiveRole === "superadmin") && (
                    <div className="glass-panel p-4 md:p-8 rounded-[40px] border-white/5 h-full overflow-y-auto">
                      <EmergencyTestPanel 
                        onTrigger={async (type) => {
                          try {
                            const { createSOS } = useSOSStore.getState();
                            await createSOS(
                              type.toUpperCase() as any,
                              "SIMULATED TEST ALERT",
                              { lat: 14.5995, lng: 120.9842 } // Default Manila coords for simulation
                            );
                            toast.success("SIMULATION TRIGGERED");
                            setActiveTab("map");
                          } catch (err) {
                            toast.error("SIMULATION FAILED");
                          }
                        }} 
                      />
                    </div>
                  )}
                {activeTab === "resident-map" &&
                  (effectiveRole === "admin" ||
                    effectiveRole === "superadmin") &&
                  effectiveProfile && (
                    <ResidentTacticalMap profile={effectiveProfile} />
                  )}
                {activeTab === "directory" && <DirectoryView />}
                {activeTab === "schedule" && effectiveProfile && (
                  <ScheduleView
                    profile={effectiveProfile}
                    role={effectiveRole as any}
                  />
                )}
                {activeTab === "reports" && <ReportsView />}
                {activeTab === "records" && <DigitalRecordsView />}
                {activeTab === "settings" && effectiveProfile && (
                  <SettingsView
                    profile={effectiveProfile}
                    role={effectiveRole as any}
                  />
                )}
                {activeTab === "roster" && <TanodRosterView />}
                {activeTab === "logs" &&
                  (effectiveRole === "admin" ||
                    effectiveRole === "superadmin") && <TanodActivityLogs />}
                {activeTab === "ops" && (effectiveRole === "admin" || effectiveRole === "superadmin") && (
                  <OpsIntegrations />
                )}
              </motion.div>
            </AnimatePresence>
          </GlobalErrorBoundary>

          {isIncidentFormOpen && effectiveProfile && (
            <IncidentForm
              profile={effectiveProfile}
              onClose={() => setIsIncidentFormOpen(false)}
            />
          )}
          {effectiveProfile && effectiveRole === "tanod" && (
            <TanodCommandAlert
              profile={effectiveProfile}
              isTestMode={viewOverride === "tanod"}
            />
          )}

          <SirenController
            globalSirenActive={globalSirenActive}
            profile={effectiveProfile}
            alerts={alerts}
          />

          {/* System Guardian AI Intelligence Integration */}
          {user && (
            <>
              <GuardianGreeting />
              <GuardianVoiceAssistant />
            </>
          )}


          <SOSAlertSiren userRole={effectiveRole} />
          <BackgroundServices />
        </main>
      </div>
    </GlobalErrorBoundary>
  );
}
