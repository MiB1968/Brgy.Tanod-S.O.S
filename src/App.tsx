/**
 * Brgy. Tanod S.O.S - Main App Component (Production Ready)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

import socket from "./lib/socket";
import * as api from "./lib/api";
import { useAuthStore } from "./store/useAuthStore";
import { useIncidentStore } from "./store/useIncidentStore";
import { useTanodStore } from "./store/useTanodStore";
import { useSystemStore } from "./store/useSystemStore";
import { useSOSStore } from "./store/useSOSStore";

import { useRBAC } from "./context/AuthContext";
import { useSocketListeners } from "./hooks/useSocketListeners";
import { useAudioInitializer } from "./hooks/useAudioInitializer";

import type { UserRole } from "./types";
import { isMasterAdmin } from "./lib/auth";           
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";

// Components
import { LoginView, RoleSelection } from "./components/AuthViews";
import { NavigationSidebar } from "./components/NavigationSidebar";
import SOSAlertSiren from "./components/SOSAlertSiren";
import TanodCommandAlert from "./components/TanodCommandAlert";
import DashboardView from "./components/DashboardView";
import LiveMap from "./LiveMap";

import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./lib/firebase";

export default function App() {
  useAudioInitializer();

  const { user: firebaseUser, role: rbacRole, loading: rbacLoading } = useRBAC();

  const { profile, setProfile } = useAuthStore();
  const { alerts, addAlert } = useIncidentStore();
  const { patrols, setPatrols } = useTanodStore();
  const { isOnline, triggerSync } = useSystemStore();
  const { subscribeToUserAlerts } = useSOSStore();

  const [activeTab, setActiveTab] = useState<"home" | "map" | "reports" | "settings">("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const effectiveRole = useMemo(() => {
    if (isMasterAdmin(profile?.email)) return "superadmin";
    return rbacRole || profile?.role || "resident";
  }, [profile?.email, rbacRole, profile?.role]);

  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [globalSirenActive, setGlobalSirenActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  // Socket listeners
  useSocketListeners({
    effectiveProfile: profile,
    effectiveRole,
    setActiveBroadcast,
    setGlobalSirenActive,
    setIsShaking,
    setActiveTab
  });

  // Online / Offline sync
  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
      toast.success("✅ Connection restored — syncing queued SOS");
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [triggerSync]);

  const handleSOS = useCallback(async (emergencyType: string) => {
    try {
      const sosData = {
        type: emergencyType,
        timestamp: new Date().toISOString(),
        status: "pending" as const,
      };
      await api.alerts.create(sosData);
      toast.success("🚨 SOS Sent Successfully", { icon: "🛡️" });
    } catch (err) {
      toast.error("⚠️ SOS queued for offline sync");
      // offline queue handled by useSystemStore / offlineService
    }
  }, []);

  if (rbacLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-950 text-white font-mono uppercase tracking-widest text-[11px] animate-pulse">Establishing Secure Link...</div>;
  }

  if (showRoleSelection) {
    return (
      <RoleSelection 
        onSelect={async (role) => {
          if (firebaseUser) {
             const userDocRef = doc(db, "users", firebaseUser.uid);
             await setDoc(userDocRef, { role, updatedAt: serverTimestamp() }, { merge: true });
             // Reload page to re-fetch context
             window.location.reload();
          } else {
             setProfile({ id: "guest", uid: "guest", email: "guest@example.com", status: "Available", createdAt: new Date().toISOString(), name: "Guest", role } as any);
             setShowRoleSelection(false);
          }
        }}
        onRegister={() => setShowRoleSelection(false)}
      />
    );
  }

  // If we don't have a firebase user and we aren't bypassing via a mock profile
  if (!firebaseUser && (!profile || profile.uid !== "guest")) {
    return (
      <LoginView 
        onLogin={(email, password) => email && password && signInWithEmailAndPassword(auth, email, password)}
        onRegister={() => {}}
        isLoggingIn={rbacLoading}
        onDemoLogin={() => setShowRoleSelection(true)}
        onDemoAdminLogin={() => setShowRoleSelection(true)}
        onGoogleLogin={() => signInWithPopup(auth, new GoogleAuthProvider())}
        onResetSession={() => {}}
      />
    );
  }

  return (
    <GlobalErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <NavigationSidebar 
          activeTab={activeTab} 
          setActiveTab={(tab: string) => setActiveTab(tab as "home" | "map" | "reports" | "settings")} 
          effectiveRole={effectiveRole} 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={firebaseUser || {}}
          profile={profile || {}}
          handleLogout={() => { /* implement proper logout later */ }}
          handleInstallApp={() => {}}
          onSwitchRole={() => setShowRoleSelection(true)}
        />

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <DashboardView 
                profile={{ ...(profile || { id: "guest", uid: "guest", email: "guest@example.com", status: "Available", createdAt: new Date().toISOString(), name: "Guest" }), role: effectiveRole as UserRole }}
                alerts={alerts}
                patrols={patrols}
                visiblePatrols={patrols}
                onTabChange={(tab: string) => setActiveTab(tab as "home" | "map" | "reports" | "settings")}
                isOnline={isOnline}
                deferredPrompt={null}
                onInstall={() => {}}
                sirenActive={globalSirenActive}
                onToggleSiren={() => setGlobalSirenActive(!globalSirenActive)}
                activeBroadcast={activeBroadcast}
              />
            )}
            {activeTab === "map" && <LiveMap />}
          </AnimatePresence>
        </main>

        <SOSAlertSiren userRole={effectiveRole} onSOS={handleSOS} />
        <TanodCommandAlert profile={{ ...(profile || { id: "guest", uid: "guest", email: "guest@example.com", status: "Available", createdAt: new Date().toISOString(), name: "Guest" }), role: effectiveRole as UserRole }} />
        <GuardianVoiceAssistant />

        <Toaster position="top-center" />
      </div>
    </GlobalErrorBoundary>
  );
}
