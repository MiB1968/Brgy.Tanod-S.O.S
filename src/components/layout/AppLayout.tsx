// src/components/layout/AppLayout.tsx
import React from "react";
import { Menu, X } from "lucide-react";
import { TanodLogo } from "../Branding";

interface AppLayoutProps {
  children: React.ReactNode;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  effectiveRole: string;
}

export default function AppLayout({
  children,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  effectiveRole,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top Bar / Status */}
      <div className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500" />

      {children}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-around py-2">
          {["home", "map", "tracker", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => {/* Handled in AppHeader or parent */}}
              className="flex flex-col items-center py-1 px-3 text-xs"
            >
              {/* Icon logic can be expanded */}
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
