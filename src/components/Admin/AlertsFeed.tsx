import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Filter, CheckCircle, AlertTriangle, MapPin } from "lucide-react";
import { Alert, User } from "../../types";
import { cn } from "../../lib/utils";
import { TacticalCard } from "../Tactical/TacticalCard";
import { TacticalButton } from "../Tactical/TacticalButton";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface AlertsFeedProps {
  alerts: Alert[];
  profile: User | null;
  onUpdateStatus: (alert: Alert, status: Alert["status"]) => Promise<void>;
  onDispatch: (alert: Alert) => void;
  onDetails: (alert: Alert) => void;
}

export function AlertsFeed({
  alerts,
  profile,
  onUpdateStatus,
  onDispatch,
  onDetails,
}: AlertsFeedProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");
  const [filterTime, setFilterTime] = useState<string>("ALL");

  const isActiveAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === "pending" || status === "active" || status === "needs_review";
  };
  const isRespondedAlert = (alert: Alert) =>
    alert.status?.toLowerCase() === "responding";
  const isResolvedAlert = (alert: Alert) => {
    const status = alert.status?.toLowerCase();
    return status === "resolved" || status === "cancelled";
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus === "ACTIVE") {
      if (isResolvedAlert(alert)) return false;
    } else if (filterStatus !== "ALL") {
      if (alert.status !== filterStatus.toLowerCase()) return false;
    }

    const typeEnum: Record<string, string> = {
      MEDICAL: "Medical Emergency",
      FIRE: "Fire Alert",
      CRIME: "Criminal Activity",
      DISASTER: "Natural Disaster",
    };

    if (filterType !== "ALL") {
      const match = typeEnum[filterType] || filterType;
      if (
        !alert.type.toUpperCase().includes(filterType) &&
        alert.type !== match
      )
        return false;
    }

    if (filterTime !== "ALL") {
      const alertDate = new Date(alert.timestamp);
      const now = new Date();
      const diffHours =
        (now.getTime() - alertDate.getTime()) / (1000 * 60 * 60);

      if (filterTime === "1H" && diffHours > 1) return false;
      if (filterTime === "4H" && diffHours > 4) return false;
      if (filterTime === "24H" && diffHours > 24) return false;
    }

    return true;
  });

  return (
    <div className="lg:col-span-2 space-y-4 md:space-y-6">
      <TacticalCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase font-display text-white">
            <Zap className="w-5 h-5 text-tactical-red" />
            LIVE EMERGENCY FEED
          </h3>
          <span className="px-3 py-1 bg-tactical-red/10 text-tactical-red text-[8px] font-black rounded-full animate-pulse tracking-[0.2em]">
            MONITORING ACTIVE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-tactical-dark p-3 rounded-2xl border border-tactical-cyan/20">
          <div className="flex items-center gap-2 px-3">
            <Filter className="w-3.5 h-3.5 text-tactical-cyan/60" />
            <span className="text-[9px] font-black uppercase text-tactical-cyan/60 tracking-widest font-mono">
              Operations Filter
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-tactical-dark border border-tactical-cyan/30 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/70 font-mono outline-none uppercase cursor-pointer"
            >
              <option value="ACTIVE">STATUS: ACTIVE_ONLY</option>
              <option value="ALL">STATUS: ALL_INTEL</option>
              <option value="PENDING">STATUS: PENDING</option>
              <option value="RESPONDING">STATUS: RESPONDING</option>
              <option value="NEEDS_REVIEW">STATUS: NEEDS_REVIEW</option>
              <option value="RESOLVED">STATUS: ARCHIVED</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-tactical-dark border border-tactical-cyan/30 rounded-xl px-3 py-1.5 text-[9px] font-black text-white/70 font-mono outline-none uppercase cursor-pointer"
            >
              <option value="ALL">TYPE: ALL_SIGS</option>
              <option value="MEDICAL">TYPE: MEDICAL</option>
              <option value="FIRE">TYPE: FIRE</option>
              <option value="CRIME">TYPE: CRIME</option>
              <option value="DISASTER">TYPE: DISASTER</option>
            </select>
          </div>
        </div>
      </TacticalCard>

      <div className="space-y-4 staggered-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredAlerts.length === 0 ? (
            <TacticalCard className="text-center p-12">
              <CheckCircle className="w-12 h-12 text-tactical-cyan mx-auto mb-4 opacity-50" />
              <p className="text-white/40 font-black uppercase tracking-widest text-xs font-mono relative z-10">
                No matching emergency alerts detected.
              </p>
            </TacticalCard>
          ) : (
            filteredAlerts.map((alert, index) => (
              <motion.div
                layout
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                transition={{ delay: index * 0.05 }}
                key={alert.id}
              >
                <TacticalCard
                  className={cn(
                    "cursor-pointer transition-all border-l-4",
                    isActiveAlert(alert)
                      ? "border-l-tactical-red"
                      : isRespondedAlert(alert)
                      ? "border-l-tactical-blue"
                      : "border-l-tactical-cyan"
                  )}
                  onClick={() => onDetails(alert)}
                >
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                            alert.status === "pending"
                              ? "bg-tactical-red/20 text-tactical-red"
                              : "bg-tactical-dark text-white/40"
                          )}
                        >
                          <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h4 className="font-black text-lg md:text-xl text-white truncate max-w-[150px] uppercase font-display italic tracking-tighter">
                              {alert.residentName}
                            </h4>
                            <span
                              className={cn(
                                "px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest font-mono",
                                alert.status === "pending"
                                  ? "bg-tactical-red/20 text-tactical-red border border-tactical-red/30"
                                  : alert.status === "responding"
                                  ? "bg-tactical-blue/20 text-tactical-blue border border-tactical-blue/30"
                                  : alert.status === "needs_review"
                                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                  : "bg-tactical-cyan/20 text-tactical-cyan border border-tactical-cyan/30"
                              )}
                            >
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 font-bold flex items-center gap-2 font-mono uppercase tracking-tight">
                            <MapPin className="w-3 h-3 text-tactical-red" />{" "}
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 bg-tactical-dark p-4 rounded-xl border border-tactical-cyan/10">
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 font-mono">
                            Incident Type
                          </p>
                          <p className="text-sm font-bold text-white uppercase italic font-display">
                            {alert.type}
                          </p>
                        </div>
                        {alert.status === "needs_review" && (
                          <div className="flex-1 bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1 font-mono">
                                Security Flag
                              </p>
                              <p className="text-[10px] font-bold text-white uppercase font-mono">
                                ⚠ {alert.reviewReason || "Review Required"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 shrink-0 justify-center">
                      <a
                        href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-tactical-dark border border-tactical-cyan/30 text-white text-xs font-black rounded-2xl transition-all font-mono tracking-widest hover:bg-tactical-cyan/10"
                      >
                        <MapPin className="w-4 h-4 text-tactical-red" /> TRACK
                        GPS
                      </a>
                      <div className="flex gap-2">
                        {isActiveAlert(alert) && (
                          <TacticalButton
                            label="Dispatch"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDispatch(alert);
                            }}
                          />
                        )}
                        {(isActiveAlert(alert) || isRespondedAlert(alert)) && (
                          <TacticalButton
                            label="Resolve"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(alert, "resolved");
                            }}
                            className="bg-tactical-cyan/20 border-tactical-cyan"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </TacticalCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
