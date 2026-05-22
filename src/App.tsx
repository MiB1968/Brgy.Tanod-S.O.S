/**
 * Brgy. Tanod S.O.S - Main App Component (Production Ready)
 */
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "motion/react";

import { useAppLogic } from "./hooks/useAppLogic";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { GuardianVoiceAssistant } from "./components/ai/GuardianVoiceAssistant";

// Components
import RegistrationForm from "./components/auth/RegistrationForm";
import { LoginView, PendingApproval, RejectedScreen } from "./components/AuthViews";
import { NavigationSidebar } from "./components/NavigationSidebar";
import SOSAlertSiren from "./components/SOSAlertSiren";
import TanodCommandAlert from "./components/TanodCommandAlert";
import DashboardView from "./components/DashboardView";
import LiveMap from "./LiveMap";

export default function App() {
  const {
    user,
    setUser,
    profile,
    setProfile,
    effectiveProfile,
    effectiveRole,
    isMasterAdmin,
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isIncidentFormOpen,
    setIsIncidentFormOpen,
    isRegistering,
    setIsRegistering,
    deferredPrompt,
    globalSirenActive,
    isShaking,
    activeBroadcast,
    isTacticalVoiceOpen,
    setIsTacticalVoiceOpen,
    isLoggingIn,
    loading,
    rbacLoading,
    isOnline,
    visiblePatrols,
    alerts,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleDemoLogin,
    toggleGlobalSiren,
    handleInstallApp,
  } = useAppLogic();

  // Show loading screen during state initialization
  if (rbacLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050508] font-mono flex-col gap-4 text-white">
        <div className="w-10 h-10 border-4 border-emergency border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Tanod Network...</div>
      </div>
    );
  }

  // Handle citizen registration flow
  if (isRegistering) {
    return (
      <RegistrationForm 
        onCancel={() => setIsRegistering(false)} 
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setUser(newProfile);
          setIsRegistering(false);
        }} 
      />
    );
  }

  // If there's no authenticated profile, show gateway login screen
  if (!effectiveProfile) {
    return (
      <LoginView 
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        onRegister={() => setIsRegistering(true)}
        isLoggingIn={isLoggingIn}
        onDemoLogin={() => handleDemoLogin("resident")}
        onDemoAdminLogin={() => handleDemoLogin("admin")}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallApp}
        onResetSession={handleLogout}
      />
    );
  }

  // Handle application specific status workflows
  if (effectiveProfile.status === "pending") {
    return (
      <PendingApproval 
        user={effectiveProfile} 
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallApp}
        onLogout={handleLogout} 
      />
    );
  }

  if (effectiveProfile.status === "rejected") {
    return (
      <RejectedScreen 
        reason={effectiveProfile.rejectionReason || "Identity verification failed."} 
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallApp}
        onLogout={handleLogout} 
      />
    );
  }

  // Authenticated district layout
  return (
    <GlobalErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <NavigationSidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => setActiveTab(tab as any)} 
          effectiveRole={effectiveRole} 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={user}
          profile={effectiveProfile}
          handleLogout={handleLogout}
          handleInstallApp={handleInstallApp}
        />

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <DashboardView 
                profile={effectiveProfile} 
                alerts={alerts} 
                patrols={visiblePatrols} 
                visiblePatrols={visiblePatrols}
                onTabChange={(tab) => setActiveTab(tab as any)}
                isOnline={isOnline}
                deferredPrompt={deferredPrompt}
                onInstall={handleInstallApp}
                sirenActive={globalSirenActive}
                onToggleSiren={toggleGlobalSiren}
                activeBroadcast={activeBroadcast}
              />
            )}
            {activeTab === "map" && <LiveMap />}
          </AnimatePresence>
        </main>

        <SOSAlertSiren userRole={effectiveRole} />
        <TanodCommandAlert profile={effectiveProfile} />
        <GuardianVoiceAssistant />

        {/* Development & Diagnostics Overlay */}
        {true && (
          <div className="fixed bottom-4 right-4 z-[9999] bg-black/95 text-[10px] text-white/70 p-3 border border-white/10 rounded-xl space-y-1 font-mono max-w-[280px] shadow-2xl backdrop-blur-md">
            <div className="font-extrabold uppercase tracking-widest text-[#FF4B4B] mb-1 pb-1 border-b border-white/5">Tanod Dev_Status</div>
            <div className="truncate">USER: {user ? `${user.name} (${user.role})` : "null"}</div>
            <div className="truncate">PROFILE: {profile ? `${profile.name} (${profile.role})` : "null"}</div>
            <div className="truncate">EFFECTIVE: {effectiveProfile ? `${effectiveProfile.name} (${effectiveProfile.role})` : "null"}</div>
            <div>STATUS: {effectiveProfile?.status || "none"}</div>
            <div>ROLE: {effectiveRole}</div>
            <div>TAB: {activeTab}</div>
          </div>
        )}

        <Toaster position="top-center" />
      </div>
    </GlobalErrorBoundary>
  );
}
