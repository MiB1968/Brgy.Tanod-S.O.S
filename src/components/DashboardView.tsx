import ResidentDashboard from './ResidentDashboard';
import TanodDashboard from './TanodDashboard';
import AdminDashboard from './AdminDashboard';
import { User, Alert, PatrolLocation, SystemBroadcast } from '../types';

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
  if (!profile) {
    return <div className="text-center p-12 text-[#8E9299]">Loading profile...</div>;
  }
  
  console.log('[DEBUG] DashboardView rendered with profile role:', profile?.role);
  if (profile?.role === 'resident') {
    return (
      <ResidentDashboard 
        profile={profile} 
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
  if (profile?.role === 'tanod') {
    return (
      <TanodDashboard 
        profile={profile} 
        deferredPrompt={deferredPrompt} 
        onInstall={onInstall} 
        sirenActive={sirenActive} 
        onToggleSiren={onToggleSiren} 
      />
    );
  }
  if (profile?.role === 'admin' || profile?.role === 'superadmin') {
    return (
      <AdminDashboard 
        profile={profile} 
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
