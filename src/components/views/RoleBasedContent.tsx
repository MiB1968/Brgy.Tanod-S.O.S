// src/components/views/RoleBasedContent.tsx
import React, { lazy, Suspense } from "react";
import { useTanodStore } from "../../store/useTanodStore";
import LiveMap from '../LiveMap';
import AboutModal from '../AboutModal';
import { CitizenReportTracker } from '../CitizenReportTracker';
import { UserRole, PatrolLocation } from "../../types";

const AdminDashboard = lazy(() => import("../AdminDashboard").then(m => ({ default: m.default })));
const TanodDashboard = lazy(() => import("../TanodDashboard").then(m => ({ default: m.default })));
const ResidentDashboard = lazy(() => import("../ResidentDashboard").then(m => ({ default: m.default })));

// Dynamic sub-views for sidebar navigation tabs
const AdminResidents = lazy(() => import("../AdminResidents"));
const ResidentVerification = lazy(() => import("../Admin/ResidentVerification").then(m => ({ default: m.ResidentVerification })));
const ResidentTacticalMap = lazy(() => import("../Admin/ResidentTacticalMap"));
const CreateUserForm = lazy(() => import("../Admin/CreateUserForm"));
const TanodRosterView = lazy(() => import("../TanodRosterView"));
const ScheduleView = lazy(() => import("../ScheduleView"));
const ReportsView = lazy(() => import("../ReportsView"));
const DigitalRecordsView = lazy(() => import("../DigitalRecordsView"));
const DirectoryView = lazy(() => import("../DirectoryView"));
const GuardianAIChat = lazy(() => import("../GuardianAIChat"));
const SettingsView = lazy(() => import("../SettingsView"));
const OpsIntegrations = lazy(() => import("../Admin/OpsIntegrations"));
const TanodActivityLogs = lazy(() => import("../Admin/TanodActivityLogs").then(m => ({ default: m.TanodActivityLogs })));
const SavedAreasManager = lazy(() => import("../SavedAreasManager"));

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
  visiblePatrols: PatrolLocation[];
  viewOverride?: string | null;
  setViewOverride?: (role: string | null) => void;
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
  visiblePatrols,
  viewOverride,
  setViewOverride,
}: Props) {
  const { patrols } = useTanodStore();

  const handleTabChange = (tab: string) => {
    if (onTabChange) onTabChange(tab);
  };

  const loadingFallback = (
    <div className="flex items-center justify-center p-12 text-gray-400">
      Loading dashboard...
    </div>
  );

  // Router-like layout switcher based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "map":
        return <LiveMap />;

      case "areas":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Offline Cache Index</h1>
            <SavedAreasManager />
          </div>
        );
      
      case "logs":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Detailed Tanod Activity Logs</h1>
            <TanodActivityLogs />
          </div>
        );

      case "tracker":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Tactical GPS Tracker</h1>
            {effectiveRole === 'resident' ? (
              <CitizenReportTracker userId={effectiveProfile?.id || ""} />
            ) : (
              <div className="h-[600px] rounded-[32px] overflow-hidden border border-white/5 relative">
                <LiveMap />
              </div>
            )}
          </div>
        );

      case "residents":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Community Residents</h1>
            <AdminResidents profile={effectiveProfile} />
          </div>
        );

      case "verification":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Resident Verification</h1>
            <ResidentVerification />
          </div>
        );

      case "create-user":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Deploy Profile Account</h1>
            <CreateUserForm />
          </div>
        );

      case "resident-map":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Resident Tactical Map</h1>
            <div className="h-[600px] rounded-[32px] overflow-hidden border border-white/5 relative">
              <ResidentTacticalMap profile={effectiveProfile} />
            </div>
          </div>
        );

      case "roster":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Tanod Units Roster</h1>
            <TanodRosterView />
          </div>
        );

      case "schedule":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Patrol Schedule</h1>
            <ScheduleView role={effectiveRole as UserRole} profile={effectiveProfile} />
          </div>
        );

      case "reports":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">SOS Threat Reports</h1>
            <ReportsView />
          </div>
        );

      case "records":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Workspace Documents</h1>
            <DigitalRecordsView />
          </div>
        );

      case "directory":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Emergency Directory</h1>
            <DirectoryView />
          </div>
        );

      case "guardian":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Guardian AI Operations</h1>
            <div className="max-w-4xl mx-auto">
              <GuardianAIChat isInline={true} />
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Config Dashboard</h1>
            <SettingsView profile={effectiveProfile} role={effectiveRole as UserRole} />
          </div>
        );

      case "ops":
        return (
          <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">Operations Integrations</h1>
            <OpsIntegrations />
          </div>
        );

      case "home":
      default:
        // Default dashboards based on role
        if (effectiveRole === "admin" || effectiveRole === "superadmin") {
          return (
            <AdminDashboard
              profile={effectiveProfile}
              onTabChange={handleTabChange}
              deferredPrompt={deferredPrompt}
              onInstall={onInstall}
              sirenActive={sirenActive || false}
              onToggleSiren={onToggleSiren || (() => {})}
              activeBroadcast={activeBroadcast}
              viewOverride={viewOverride}
              setViewOverride={setViewOverride}
            />
          );
        } else if (effectiveRole === "tanod") {
          return (
            <TanodDashboard
              profile={effectiveProfile}
              deferredPrompt={deferredPrompt}
              onInstall={onInstall}
              sirenActive={sirenActive || false}
              onToggleSiren={onToggleSiren || (() => {})}
              onTabChange={handleTabChange}
            />
          );
        } else if (effectiveRole === "resident") {
          return (
            <ResidentDashboard
              profile={effectiveProfile}
              patrols={patrols}
              visiblePatrols={visiblePatrols}
              isOnline={isOnline}
              deferredPrompt={deferredPrompt}
              onInstall={onInstall || (() => {})}
              onTabChange={handleTabChange}
              sirenActive={sirenActive || false}
              onToggleSiren={onToggleSiren || (() => {})}
            />
          );
        } else {
          return <div className="p-8 text-center text-red-400">Unknown role: {effectiveRole}</div>;
        }
    }
  };

  return (
    <Suspense fallback={loadingFallback}>
      {renderTabContent()}
    </Suspense>
  );
}

