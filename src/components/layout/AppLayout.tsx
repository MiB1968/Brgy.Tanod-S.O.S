// src/components/layout/AppLayout.tsx
import React from "react";
import { 
  Home, 
  Map, 
  Shield, 
  Settings, 
  Menu,
  ClipboardList,
  HardDrive,
  Navigation,
  Bot,
  Phone,
  UserCheck
} from "lucide-react";
import { NavigationSidebar } from "../NavigationSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  effectiveRole: string;
  user?: any;
  profile?: any;
  handleLogout?: () => void;
  deferredPrompt?: any;
  handleInstallApp?: () => void;
}

export default function AppLayout({
  children,
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  effectiveRole,
  user,
  profile,
  handleLogout = () => {},
  deferredPrompt,
  handleInstallApp = () => {},
}: AppLayoutProps) {
  
  // Custom smart bottom tabs designed for different roles
  const getTabsByRole = (role: string) => {
    switch (role) {
      case "admin":
      case "superadmin":
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Live Intel", icon: Map },
          { id: "logs", label: "Logs", icon: ClipboardList },
          { id: "verification", label: "Verify", icon: UserCheck },
          { id: "settings", label: "Config", icon: Settings },
        ];
      case "tanod":
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Live Map", icon: Map },
          { id: "areas", label: "Areas", icon: HardDrive },
          { id: "tracker", label: "My GPS", icon: Navigation },
          { id: "guardian", label: "Guardian", icon: Bot },
        ];
      case "resident":
      default:
        return [
          { id: "home", label: "Command", icon: Home },
          { id: "map", label: "Tanod Map", icon: Map },
          { id: "directory", label: "Hotlines", icon: Phone },
          { id: "guardian", label: "Guardian", icon: Bot },
          { id: "settings", label: "Config", icon: Settings },
        ];
    }
  };

  const tabs = getTabsByRole(effectiveRole);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <NavigationSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        effectiveRole={effectiveRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={user}
        profile={profile}
        handleLogout={handleLogout}
        deferredPrompt={deferredPrompt}
        handleInstallApp={handleInstallApp}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative z-0">
        {/* Top Bar / Status */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 shrink-0" />
        
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-[90] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {children}

        {/* Mobile Bottom Navigation - Cyberpunk Tactical Style */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-brand-bg/95 backdrop-blur-2xl md:hidden safe-area-bottom">
          <div className="flex items-center justify-around py-3 max-w-md mx-auto px-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className={`flex flex-col items-center py-1.5 px-3 transition-transform duration-200 active:scale-95 ${
                    isActive ? "text-tactical-red scale-110" : "text-white/40 hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? "text-tactical-red" : ""}`} />
                  <span className="text-[9px] font-mono font-bold tracking-tight uppercase">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
