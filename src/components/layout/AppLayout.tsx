// src/components/layout/AppLayout.tsx
import React from "react";
import { Home, Map, Shield, Settings, Menu } from "lucide-react";
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
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "map", label: "Map", icon: Map },
    { id: "tracker", label: "Tracker", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

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

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-around py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center py-1 px-3 text-[10px] ${
                  activeTab === tab.id ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? "text-red-500" : ""}`} />
                <span className="capitalize">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
