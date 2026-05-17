
import React from 'react';
import { LoginView, RoleSelection, PendingApproval, RejectedScreen } from '../components/AuthViews';
import RegistrationForm from '../components/RegistrationForm';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';

// Define Props
interface AppNavigatorProps {
  user: any;
  profile: any;
  residentProfile: any;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  handleLogin: (email?: string, password?: string) => void;
  isLoggingIn: boolean;
  handleDemoLogin: (role: "resident" | "admin") => void;
  deferredPrompt: any;
  handleInstallApp: () => void;
  resetAuthSession: () => void;
  handleSetRole: (role: any) => void;
  isSettingRole: boolean;
  effectiveRole: string;
  viewOverride: string | null;
  handleLogout: () => void;
  onRegisterComplete: (data: any) => void;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  user,
  profile,
  residentProfile,
  isRegistering,
  setIsRegistering,
  handleLogin,
  isLoggingIn,
  handleDemoLogin,
  deferredPrompt,
  handleInstallApp,
  resetAuthSession,
  handleSetRole,
  isSettingRole,
  effectiveRole,
  viewOverride,
  handleLogout,
  onRegisterComplete,
}) => {
  
  if (isRegistering)
    return (
      <GlobalErrorBoundary>
        <RegistrationForm
          onCancel={() => setIsRegistering(false)}
          onComplete={onRegisterComplete}
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

  return null; // Return null if it's the main app view
};
