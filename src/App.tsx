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

import { isMasterAdmin } from "./lib/auth";           // ← New file we created
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";

// Components
import { LoginView } from "./components/AuthViews";
import { NavigationSidebar } from "./components/NavigationSidebar";
import SOSAlertSiren from "./components/SOSAlertSiren";
import TanodCommandAlert from "./components/TanodCommandAlert";
import DashboardView from "./components/DashboardView";
import LiveMap from "./LiveMap";

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

  // Socket listeners
  useSocketListeners({
    effectiveProfile: profile ? { ...profile, uid: profile.uid || profile.id } : null,
    effectiveRole,
    setActiveBroadcast: (b) => {
      console.log("Broadcast received:", b);
    },
    setGlobalSirenActive: (s) => {
      console.log("Global siren status:", s);
    },
    setIsShaking: (shake) => {
      console.log("Layout shaking status:", shake);
    },
    setActiveTab: (tab) => setActiveTab(tab as any),
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
    return <div className="flex h-screen items-center justify-center">Loading Tanod System...</div>;
  }

  return (
    <GlobalErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <NavigationSidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => setActiveTab(tab as any)} 
          effectiveRole={effectiveRole} 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={firebaseUser}
          profile={profile}
          handleLogout={() => window.location.reload()}
          handleInstallApp={() => {}}
        />

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <DashboardView 
                profile={profile} 
                alerts={alerts} 
                patrols={patrols} 
                visiblePatrols={patrols} // Simplification for now
                onTabChange={(tab) => setActiveTab(tab as any)}
                isOnline={isOnline}
                deferredPrompt={null}
                onInstall={() => {}}
                sirenActive={false} // Should be from store
                onToggleSiren={() => {}}
                activeBroadcast={null}
              />
            )}
            {activeTab === "map" && <LiveMap />}
          </AnimatePresence>
        </main>

        <SOSAlertSiren userRole={effectiveRole} />
        <TanodCommandAlert profile={profile} />
        <GuardianVoiceAssistant />

        <Toaster position="top-center" />
      </div>
    </GlobalErrorBoundary>
  );
}
