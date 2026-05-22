// src/components/views/RoleBasedContent.tsx
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import LiveMap from "../LiveMap";
import NewsUpdates from "../NewsUpdates";

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
}: Props) {
  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-950">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === "home" && (
            <div className="space-y-8">
              {/* Greeting */}
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Good day, {effectiveProfile?.name?.split(" ")[0] || "Kababayan"}!
                </h1>
                <p className="text-gray-400 mt-1">
                  {isOnline ? "🟢 System Online" : "📴 Offline Mode"}
                </p>
              </div>

              {/* Animated Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass-panel rounded-3xl p-6 cursor-pointer"
                >
                  <div className="text-red-400 text-sm font-medium">ACTIVE ALERTS</div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-bold text-red-500 mt-4"
                  >
                    {alerts.length}
                  </motion.div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass-panel rounded-3xl p-6 cursor-pointer"
                >
                  <div className="text-green-400 text-sm font-medium">TANOD ONLINE</div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-bold text-green-500 mt-4"
                  >
                    14
                  </motion.div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass-panel rounded-3xl p-6 cursor-pointer"
                >
                  <div className="text-amber-400 text-sm font-medium">AVG RESPONSE</div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-bold text-amber-500 mt-4"
                  >
                    3.8<span className="text-lg">min</span>
                  </motion.div>
                </motion.div>
              </div>

              {/* Recent Alerts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel rounded-3xl p-6"
              >
                <h3 className="font-semibold text-lg mb-5">Recent Alerts</h3>
                {alerts.length > 0 ? (
                  alerts.slice(0, 3).map((alert: any, index: number) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-gray-700 py-4 last:border-none"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium capitalize">{alert.type}</span>
                          <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                            {alert.description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(alert.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-12">No active alerts at the moment</p>
                )}
              </motion.div>

              {/* News Updates via Firecrawl */}
              <NewsUpdates />
            </div>
          )}

          {activeTab === "map" && <LiveMap />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
