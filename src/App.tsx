// src/App.tsx
import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "motion/react";
import * as api from "./lib/api";

import { useAppLogic } from "./hooks/useAppLogic";
import { useRBAC } from "./context/AuthContext";
import { knowledgeService } from "./services/knowledgeService";

import AppLayout from "./components/layout/AppLayout";
import AppHeader from "./components/layout/AppHeader";
import AdminDashboard from "./components/AdminDashboard";
import TanodDashboard from "./components/TanodDashboard";
import ResidentDashboard from "./components/ResidentDashboard";
import { RoleBasedContent } from "./components/views/RoleBasedContent";

import LoginView from "./components/auth/LoginView";
import RegistrationForm from "./components/auth/RegistrationForm";
import RoleSelection from "./components/auth/RoleSelection";
import PendingApproval from "./components/auth/PendingApproval";
import RejectedScreen from "./components/auth/RejectedScreen";

import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

// Overlays & Components
import IncidentForm from "./components/IncidentForm";
import SOSAlertSiren from "./components/SOSAlertSiren";
import SirenController from "./components/SirenController";
import TanodCommandAlert from "./components/TanodCommandAlert";
import { GuardianGreeting } from "./components/ai/GuardianGreeting";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";
import GuardianAIChat from "./components/GuardianAIChat";
import BroadcastOverlay from "./components/BroadcastOverlay";
import BackgroundServices from "./components/BackgroundServices";
import TacticalDock from "./components/layout/TacticalDock";
import PWAStatus from "./components/PWAStatus";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

export default function App() {
  const logic = useAppLogic();
  const { loading: rbacLoading } = useRBAC();

  // Initialize dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Manage knowledge scraping service
  useEffect(() => {
    if (logic.effectiveRole === 'tanod') {
      knowledgeService.startScheduledScraping();
      knowledgeService.preloadMamburaoKnowledge();
    }
    return () => {
      knowledgeService.stopScheduledScraping();
    };
  }, [logic.effectiveRole]);

  // Listen to toggle-siren custom actions from TacticalDock
  useEffect(() => {
    const handleToggleSiren = () => {
      logic.toggleGlobalSiren();
    };
    window.addEventListener('toggle-siren', handleToggleSiren);
    return () => {
      window.removeEventListener('toggle-siren', handleToggleSiren);
    };
  }, [logic.toggleGlobalSiren]);

  // Listen for set-active-tab triggers
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail) {
        logic.setActiveTab(e.detail);
      }
    };
    window.addEventListener('set-active-tab', handleSetTab);
    return () => {
      window.removeEventListener('set-active-tab', handleSetTab);
    };
  }, [logic.setActiveTab]);

  // ── Loading State ─────────────────────────────────────
  if (logic.loading || rbacLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent animate-spin rounded-full mx-auto mb-6" />
          <p className="text-xl font-medium">Initializing Brgy. Tanod S.O.S...</p>
          <p className="text-sm text-gray-500 mt-2">Setting up secure connection</p>
        </div>
      </div>
    );
  }

  // ── Registration Flow ─────────────────────────────────
  if (logic.isRegistering) {
    return (
      <RegistrationForm 
        onCancel={() => logic.setIsRegistering(false)} 
        onComplete={async (registrationData) => {
          try {
            await api.auth.register(registrationData);
          } catch (err: any) {
            console.error("App registration error:", err);
            throw err;
          }
        }} 
      />
    );
  }

  // ── Login Screen ──────────────────────────────────────
  if (!logic.user) {
    return (
      <LoginView
        onLogin={logic.handleLogin}
        onGoogleLogin={logic.handleGoogleLogin}
        onRegister={() => logic.setIsRegistering(true)}
        isLoggingIn={logic.isLoggingIn}
      />
    );
  }

  // ── Role Selection ────────────────────────────────────
  if (!logic.profile) {
    return <RoleSelection onSelectRole={logic.handleSetRole} />;
  }

  // ── Pending / Rejected ────────────────────────────────
  if (logic.effectiveRole === "resident") {
    if (logic.profile.status === "pending") return <PendingApproval />;
    if (logic.profile.status === "rejected") return <RejectedScreen />;
  }

  // ── Main Application ──────────────────────────────────
  return (
    <GlobalErrorBoundary>
      <AppLayout
        activeTab={logic.activeTab}
        setActiveTab={logic.setActiveTab}
        isMobileMenuOpen={logic.isMobileMenuOpen}
        setIsMobileMenuOpen={logic.setIsMobileMenuOpen}
        effectiveRole={logic.effectiveRole}
        user={logic.user}
        profile={logic.effectiveProfile}
        handleLogout={logic.handleLogout}
        deferredPrompt={logic.deferredPrompt}
        handleInstallApp={logic.handleInstallApp}
      >
        {/* Header */}
        <AppHeader
          activeTab={logic.activeTab}
          setActiveTab={logic.setActiveTab}
          isMobileMenuOpen={logic.isMobileMenuOpen}
          setIsMobileMenuOpen={logic.setIsMobileMenuOpen}
          effectiveRole={logic.effectiveRole}
          isMasterAdmin={logic.isMasterAdmin}
          viewOverride={logic.viewOverride}
          setViewOverride={logic.setViewOverride}
          globalSirenActive={logic.globalSirenActive}
          toggleGlobalSiren={logic.toggleGlobalSiren}
          onNewIncident={() => logic.setIsIncidentFormOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-950 pb-20">
          <RoleBasedContent
            activeTab={logic.activeTab}
            effectiveRole={logic.effectiveRole}
            effectiveProfile={logic.effectiveProfile}
            alerts={logic.alerts}
            isOnline={logic.isOnline}
            deferredPrompt={logic.deferredPrompt}
            onInstall={logic.handleInstallApp}
            sirenActive={logic.globalSirenActive}
            onToggleSiren={logic.toggleGlobalSiren}
            activeBroadcast={logic.activeBroadcast}
            onTabChange={logic.setActiveTab}
            visiblePatrols={logic.visiblePatrols}
          />
        </main>

        {/* Global Overlays */}
        <AnimatePresence>
          {logic.isIncidentFormOpen && (
            <IncidentForm
              key="incident-form"
              onClose={() => logic.setIsIncidentFormOpen(false)}
              userRole={logic.effectiveRole}
              onSubmit={logic.sendSOS}
            />
          )}

          <SOSAlertSiren 
            key="sos-siren"
            onSOS={logic.sendSOS} 
          />

          {logic.activeBroadcast && (
            <BroadcastOverlay
              key="broadcast-overlay"
              broadcast={logic.activeBroadcast}
              onClose={() => logic.setActiveBroadcast(null)}
            />
          )}
        </AnimatePresence>

        {/* System Components */}
        <SirenController 
          globalSirenActive={logic.globalSirenActive}
          profile={logic.effectiveProfile}
          alerts={logic.alerts}
        />
        {logic.effectiveProfile && logic.effectiveRole === "tanod" && (
          <TanodCommandAlert profile={logic.effectiveProfile} />
        )}
        <GuardianGreeting />
        <GuardianVoiceAssistant />
        <GuardianAIChat />
        <BackgroundServices />

        {/* Notifications & PWA */}
        <TacticalDock />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1f2937",
              color: "#fff",
              border: "1px solid #374151",
            },
          }}
        />
        <PWAStatus />
        <PWAInstallPrompt />
      </AppLayout>
    </GlobalErrorBoundary>
  );
}
