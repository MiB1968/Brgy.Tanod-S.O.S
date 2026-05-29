import React, { useEffect, useState, Suspense } from 'react';
import { useRBAC } from './context/AuthContext';
import KeepAppOpenBanner from './components/KeepAppOpenBanner';
import TrackingStatusPanel from './components/TrackingStatusPanel';
import NotificationPermission from './components/NotificationPermission';
import { GuardianVoiceAssistant } from './components/ai/GuardianVoiceAssistant';
import TacticalDock from './components/layout/TacticalDock';
import LiveMap from './components/LiveMap';
import AppLayout from './components/layout/AppLayout';
import { RoleBasedContent } from './components/views/RoleBasedContent';
import { useTanodStore } from './store/useTanodStore';
import { tanodLocationService } from './services/tanodLocationService';
import { pushService } from './services/pushNotificationService';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import * as safeStorage from './lib/safeStorage';
import { LoginView } from './components/AuthViews';
import RegistrationForm from './components/auth/RegistrationForm';
import GuardianAIChat from './components/GuardianAIChat';
import { useEmergencyAudio } from './hooks/useEmergencyAudio';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

import * as api from './lib/api';

const App: React.FC = () => {
  const { profile: user, user: firebaseUser, loading, refreshProfile } = useRBAC();
  const [activeTab, setActiveTab] = useState('home');
  const [viewOverride, setViewOverride] = useState<string | null>(localStorage.getItem('brgy_view_override'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { patrols } = useTanodStore();

  const [sirenActive, setSirenActive] = useState(false);
  const { startSiren, stopSiren } = useEmergencyAudio();

  const handleToggleSiren = () => {
    setSirenActive(prev => {
      const next = !prev;
      if (next) {
        toast.success("🚨 SIREN ACTIVATED", { id: 'siren' });
      } else {
        toast.success("Siren Deactivated", { id: 'siren' });
      }
      return next;
    });
  };

  useEffect(() => {
    if (sirenActive) {
      startSiren('wail');
    } else {
      stopSiren();
    }
    return () => {
      stopSiren();
    };
  }, [sirenActive, startSiren, stopSiren]);

  useEffect(() => {
    const handleSirenEvent = () => {
      handleToggleSiren();
    };
    window.addEventListener('toggle-siren', handleSirenEvent);
    return () => {
      window.removeEventListener('toggle-siren', handleSirenEvent);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('siren-state-change', {
      detail: { active: sirenActive }
    }));
  }, [sirenActive]);

  const handleRegistrationComplete = async (regData: any) => {
    try {
      setIsLoggingIn(true);
      // 1. Backend Registration (SQL)
      await api.auth.register(regData);
      
      // 2. Firebase Registration (for RBAC/Firestore)
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const userCred = await createUserWithEmailAndPassword(auth, regData.email, regData.password);
      await updateProfile(userCred.user, { displayName: regData.name });
      
      setActiveTab('home');
      toast.success("Security profile established. Awaiting tactical link...");
    } catch (err: any) {
      toast.error(err.message || "Registration sequence interrupted.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectBackendLogin = async (email: string, password: string) => {
    try {
      setIsLoggingIn(true);
      const loginResponse = await api.auth.login({ 
        email, 
        password,
        isGoogle: false
      });
      
      if (loginResponse?.success && loginResponse.data?.token) {
        safeStorage.setItem('token', loginResponse.data.token);
        await refreshProfile();
        toast.success("Demo link established.");
      } else {
        toast.error(loginResponse?.error?.message || "Login failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to establish secure link.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    if (!email || !password) return;
    
    try {
      setIsLoggingIn(true);
      // 1. Firebase Auth
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Backend Handshake (JWT Cookie)
      const idToken = await userCred.user.getIdToken();
      const loginResponse = await api.auth.login({ 
        email, 
        password,
        isGoogle: false,
        firebaseIdToken: idToken
      });
      
      if (loginResponse?.success && loginResponse.data?.token) {
        safeStorage.setItem('token', loginResponse.data.token);
        toast.success("Tactical link established.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to establish secure link.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all local state
      safeStorage.removeItem('token');
      safeStorage.removeItem('brgy_user_profile');
      localStorage.removeItem('brgy_view_override');
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Reset initialization if user logs out (Firebase OR Backend)
    if (!firebaseUser && !user) {
      setIsInitialized(false);
      return;
    }

    const initializeApp = async () => {
      try {
        console.log("🚀 Initializing Brgy Tanod Tactical Link...");

        // Initialize Push Notifications
        await pushService.initialize();
        pushService.listenForMessages();

        // Start location tracking for Tanod users
        if (user?.role === 'tanod') {
          tanodLocationService.startTracking();
        }

        if (isMounted) {
          setIsInitialized(true);
          console.log("✅ Tactical Link Initialized Successfully");
        }
      } catch (error: any) {
        console.error("❌ App Initialization Failed:", error);
        if (isMounted) {
          setError(error.message || "Failed to initialize application");
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      if (user?.role === 'tanod') {
        tanodLocationService.stopTracking();
      }
    };
  }, [firebaseUser, user?.role]);

  // Loading Screen for Auth State
  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emergency/20 blur-[80px] rounded-full animate-pulse" />
          <div className="w-16 h-16 border-t-2 border-r-2 border-emergency rounded-full animate-spin relative z-10" />
          <p className="mt-8 text-[10px] font-mono font-black text-emergency uppercase tracking-[0.5em] animate-pulse">
            Establishing Secure Link...
          </p>
        </div>
      </div>
    );
  }

  // Auth Screen if not logged in via Firebase OR Backend
  if (!firebaseUser && !user) {
    if (activeTab === 'register') {
      return (
        <RegistrationForm 
          onComplete={handleRegistrationComplete}
          onCancel={() => setActiveTab('home')}
        />
      );
    }

    return (
      <LoginView 
        onLogin={handleLogin}
        onRegister={() => setActiveTab('register')}
        isLoggingIn={isLoggingIn}
        onDemoLogin={() => handleDirectBackendLogin('resident@brgytanod.com', 'tanod123')}
        onDemoAdminLogin={() => handleDirectBackendLogin('admin@brgytanod.com', 'tanod123')}
        onGoogleLogin={async () => {
          try {
            setIsLoggingIn(true);
            const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();
            
            // Note: In shared app (iframe/PWA) environments, popups can be blocked by third-party cookie/storage security settings.
            const userCred = await signInWithPopup(auth, provider);
            
            console.log("Popup login success, user:", userCred.user.email);
            const idToken = await userCred.user.getIdToken();
            
            const loginResponse = await api.auth.login({ 
              email: userCred.user.email,
              isGoogle: true,
              firebaseIdToken: idToken
            });
            
            console.log("Popup loginResponse:", loginResponse);
            
            if (loginResponse?.success && loginResponse.data?.token) {
              safeStorage.setItem('token', loginResponse.data.token);
              toast.success("Google Tactical Link Active.");
            } else {
              const backendError = loginResponse?.error?.message || "Login with backend failed.";
              throw new Error(backendError);
            }
          } catch (err: any) {
            console.error("Popup Google login error details:", err);
            
            // Specifically detect popup/storage blocking errors
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
                toast.error("Auth popup was blocked by browser. Please use 'OPEN NEW TAB' above.");
            } else {
                toast.error(`Login failed: ${err.message || 'Check browser security settings.'}`);
            }
          } finally {
            setIsLoggingIn(false);
          }
        }}
        onResetSession={() => {
          safeStorage.clear();
          window.location.reload();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center text-white">
        <div>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-500">Initialization Failed</h2>
          <p className="text-zinc-400 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-8 py-3 bg-red-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-400 font-mono tracking-widest uppercase">Initializing Central Command...</p>
        </div>
      </div>
    );
  }

  const isMasterAdmin = user?.email === 'rubenlleg12@gmail.com' || user?.email === 'ben@brgytanod.com';
  const effectiveRole = (isMasterAdmin && viewOverride) || user?.role || 'resident';

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      effectiveRole={effectiveRole}
      user={firebaseUser}
      profile={user}
      handleLogout={handleLogout}
      viewOverride={viewOverride}
      setViewOverride={(role) => {
        setViewOverride(role);
        if (role) localStorage.setItem('brgy_view_override', role);
        else localStorage.removeItem('brgy_view_override');
      }}
    >
      <div className="flex-1 overflow-y-auto relative h-full">
        <KeepAppOpenBanner />
        <NotificationPermission />
        <TrackingStatusPanel />

        <RoleBasedContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          effectiveRole={effectiveRole}
          effectiveProfile={user}
          alerts={[]}
          isOnline={true}
          visiblePatrols={patrols}
          viewOverride={viewOverride}
          setViewOverride={(role) => {
            setViewOverride(role);
            if (role) localStorage.setItem('brgy_view_override', role);
            else localStorage.removeItem('brgy_view_override');
          }}
          sirenActive={sirenActive}
          onToggleSiren={handleToggleSiren}
        />

        <TacticalDock />
        <GuardianVoiceAssistant />
        <GuardianAIChat isInline={false} />
        <PWAInstallPrompt />
      </div>
    </AppLayout>
  );
};

export default App;
