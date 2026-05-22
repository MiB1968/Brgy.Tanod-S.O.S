// src/components/views/RoleBasedContent.tsx
import React, { lazy, Suspense } from "react";
import { useTanodStore } from "../../store/useTanodStore";

const AdminDashboard = lazy(() => import("../AdminDashboard"));
const TanodDashboard = lazy(() => import("../TanodDashboard"));
const ResidentDashboard = lazy(() => import("../ResidentDashboard"));

interface Props {
  activeTab: string;
  effectiveRole: string;
  effectiveProfile: any;
  alerts: any[];
  isOnline: boolean;
  deferredPrompt?: any;
  onInstall?: () => void;
  sirenActive?: boolean;
  onToggleSiren?: () => void;
  activeBroadcast?: any;
  onTabChange?: (tab: string) => void;
}

export function RoleBasedContent({
  activeTab,
  effectiveRole,
  effectiveProfile,
  alerts,
  isOnline,
  deferredPrompt,
  onInstall,
  sirenActive,
  onToggleSiren,
  activeBroadcast,
  onTabChange,
}: Props) {
  const { patrols, visiblePatrols } = useTanodStore();

  const handleTabChange = (tab: string) => {
    if (onTabChange) onTabChange(tab);
  };

  const loadingFallback = (
    <div className="flex items-center justify-center p-12 text-gray-400">
      Loading dashboard...
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      {effectiveRole === "admin" || effectiveRole === "superadmin" ? (
        <AdminDashboard
          profile={effectiveProfile}
          onTabChange={handleTabChange}
          deferredPrompt={deferredPrompt}
          onInstall={onInstall}
          sirenActive={sirenActive || false}
          onToggleSiren={onToggleSiren || (() => {})}
          activeBroadcast={activeBroadcast}
        />
      ) : effectiveRole === "tanod" ? (
        <TanodDashboard
          profile={effectiveProfile}
          deferredPrompt={deferredPrompt}
          onInstall={onInstall}
          sirenActive={sirenActive || false}
          onToggleSiren={onToggleSiren || (() => {})}
        />
      ) : effectiveRole === "resident" ? (
        <ResidentDashboard
          profile={effectiveProfile}
          patrols={patrols}
          visiblePatrols={visiblePatrols}
          isOnline={isOnline}
          deferredPrompt={deferredPrompt}
          onInstall={onInstall}
          onTabChange={handleTabChange}
        />
      ) : (
        <div className="p-8 text-center text-red-400">Unknown role: {effectiveRole}</div>
      )}
    </Suspense>
  );
}

