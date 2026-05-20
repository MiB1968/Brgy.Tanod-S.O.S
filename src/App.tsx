// src/App.tsx
import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "motion/react";

import { useAppLogic } from "./hooks/useAppLogic";
import { useRBAC } from "./context/AuthContext";

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
import { GuardianGreeting } from "./components/ai/GuardianGreeting";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";
import GuardianAIChat from "./components/GuardianAIChat";
import BroadcastOverlay from "./components/BroadcastOverlay";
import BackgroundServices from "./components/BackgroundServices";
import FloatingSOSButton from "./components/FloatingSOSButton";
import PWAStatus from "./components/PWAStatus";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

export default function App() {
  const logic = useAppLogic();
  const { loading: rbacLoading } = useRBAC();

  // Initialize dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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
    return <RegistrationForm onCancel={() => logic.setIsRegistering(false)} onComplete={() => logic.setIsRegistering(false)} />;
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
      >
        {/* Header */}
        <AppHeader
          activeTab={logic.activeTab}
          setActiveTab={logic.setActiveTab}
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
            userRole={logic.effectiveRole} 
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
        <GuardianGreeting />
        <GuardianVoiceAssistant />
        <GuardianAIChat />
        <BackgroundServices />

        {/* Notifications & PWA */}
        <FloatingSOSButton 
          onTrigger={logic.sendSOS} 
          role={logic.effectiveRole} 
        />
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
