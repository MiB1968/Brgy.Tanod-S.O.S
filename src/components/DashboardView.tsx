import ResidentDashboard from './ResidentDashboard';
import TanodDashboard from './TanodDashboard';
import AdminDashboard from './AdminDashboard';
import { User, Alert, PatrolLocation, SystemBroadcast } from '../types';
import * as safeStorage from '../lib/safeStorage';

interface DashboardViewProps {
  profile?: User | null;
  alerts: Alert[];
  patrols: PatrolLocation[];
  onTabChange: (tab: string) => void;
  isOnline: boolean;
  deferredPrompt: any;
  onInstall: () => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
  visiblePatrols: PatrolLocation[];
  activeBroadcast: SystemBroadcast | null;
}

export default function DashboardView({
  profile,
  alerts,
  patrols,
  visiblePatrols,
  onTabChange,
  isOnline,
  deferredPrompt,
  onInstall,
  sirenActive,
  onToggleSiren,
  activeBroadcast,
}: DashboardViewProps) {
  let activeProfile = profile;
  if (!activeProfile) {
    const cached = safeStorage.getItem("user");
    if (cached) {
      try {
        activeProfile = JSON.parse(cached) as User;
      } catch (err) {
        console.error("Failed to parse cached user in DashboardView:", err);
      }
    }
  }

  if (!activeProfile) {
    return <div className="text-center p-12 text-[#8E9299]">Loading profile...</div>;
  }
  
  console.log('[DEBUG] DashboardView rendered with active profile role:', activeProfile?.role);
  if (activeProfile?.role === 'resident') {
    return (
      <ResidentDashboard 
        profile={activeProfile} 
        patrols={patrols} 
        visiblePatrols={visiblePatrols} 
        isOnline={isOnline} 
        deferredPrompt={deferredPrompt} 
        onInstall={onInstall} 
        onTabChange={onTabChange} 
        sirenActive={sirenActive} 
        onToggleSiren={onToggleSiren} 
      />
    );
  }
  if (activeProfile?.role === 'tanod') {
    return (
      <TanodDashboard 
        profile={activeProfile} 
        deferredPrompt={deferredPrompt} 
        onInstall={onInstall} 
        sirenActive={sirenActive} 
        onToggleSiren={onToggleSiren} 
      />
    );
  }
  if (activeProfile?.role === 'admin' || activeProfile?.role === 'superadmin') {
    return (
      <AdminDashboard 
        profile={activeProfile} 
        onTabChange={onTabChange} 
        deferredPrompt={deferredPrompt} 
        onInstall={onInstall} 
        sirenActive={sirenActive} 
        onToggleSiren={onToggleSiren} 
        activeBroadcast={activeBroadcast} 
      />
    );
  }
  return <div className="text-center p-12 text-[#8E9299]">Unauthorized Access</div>;
}
