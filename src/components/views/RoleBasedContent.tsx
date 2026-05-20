// src/components/views/RoleBasedContent.tsx
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import LiveMap from "../LiveMap";
import { useTanodStore } from "../../store/useTanodStore";

import AdminDashboard from "../AdminDashboard";
import TanodDashboard from "../TanodDashboard";
import ResidentDashboard from "../ResidentDashboard";

interface RoleBasedContentProps {
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
  sirenActive = false,
  onToggleSiren = () => {},
  activeBroadcast = null,
  onTabChange = () => {},
}: RoleBasedContentProps) {
  const { patrols } = useTanodStore(); // Real-time patrol data

  return (
    <div className="min-h-full p-4 pb-24">
      <AnimatePresence mode="wait">
        <div className="bg-red-900 text-white p-2 text-xs">
          DEBUG: {activeTab} | Role: {effectiveRole} | Email: {effectiveProfile?.email}
        </div>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35 }}
        >
          {/* ==================== HOME DASHBOARD ==================== */}
          {activeTab === "home" && (
            effectiveRole === "superadmin" || effectiveRole === "admin" ? (
              <AdminDashboard 
                profile={effectiveProfile}
                onTabChange={onTabChange}
                deferredPrompt={deferredPrompt}
                onInstall={onInstall}
                sirenActive={sirenActive}
                onToggleSiren={onToggleSiren}
                activeBroadcast={activeBroadcast}
              />
            ) : effectiveRole === "tanod" ? (
              <TanodDashboard 
                profile={effectiveProfile}
                deferredPrompt={deferredPrompt}
                onInstall={onInstall}
                sirenActive={sirenActive}
                onToggleSiren={onToggleSiren}
              />
            ) : (
              <ResidentDashboard 
                profile={effectiveProfile}
                patrols={patrols}
                visiblePatrols={patrols}
                isOnline={isOnline}
                deferredPrompt={deferredPrompt}
                onInstall={onInstall as any}
                onTabChange={onTabChange}
                sirenActive={sirenActive}
                onToggleSiren={onToggleSiren}
              />
            )
          )}

          {/* ==================== LIVE MAP (Real-time) ==================== */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Live Incident Map</h2>
                <div className="text-sm px-4 py-1.5 bg-gray-800 rounded-full">
                  {patrols.length} Tanod{patrols.length !== 1 ? "s" : ""} Online
                </div>
              </div>
              <LiveMap />
            </div>
          )}

          {/* ==================== TANOD TRACKER ==================== */}
          {activeTab === "tracker" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Tanod Live Tracker</h2>
              <div className="space-y-3">
                {patrols.length > 0 ? (
                  patrols.map((patrol: any, i: number) => (
                    <div
                      key={patrol.tanodId || `patrol-${i}`}
                      className="glass-panel rounded-3xl p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold">{patrol.tanodName || "Tanod"}</p>
                        <p className="text-sm text-gray-400">
                          Updated {new Date(patrol.lastUpdate).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-500 text-xl">●</div>
                        <p className="text-xs text-gray-400">
                          {patrol.speed ? `${patrol.speed} km/h` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-panel rounded-3xl p-12 text-center">
                    <p className="text-gray-400">No Tanods currently online</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SETTINGS ==================== */}
          {activeTab === "settings" && (
            <div className="max-w-md mx-auto glass-panel rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-8">Account Settings</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-gray-400 text-sm">Full Name</p>
                  <p className="font-medium text-lg">{effectiveProfile?.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Role</p>
                  <p className="font-medium capitalize text-red-400">{effectiveRole}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-green-500 font-medium">Active • Verified</p>
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other tabs */}
          {!["home", "map", "tracker", "settings"].includes(activeTab) && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="text-7xl mb-6">🛠️</div>
              <h3 className="text-2xl font-bold mb-3">Coming Soon</h3>
              <p className="text-gray-400 max-w-xs">
                The {activeTab} module is under active development.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
