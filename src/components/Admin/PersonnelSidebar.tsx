import { Shield, Clock } from "lucide-react";
import { User, PatrolLocation } from "../../types";
import { PATROL_TIMEOUT } from "../../constants";
import { cn } from "../../lib/utils";

interface PersonnelSidebarProps {
  tanods: User[];
  patrols: PatrolLocation[];
}

export function PersonnelSidebar({ tanods, patrols }: PersonnelSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-8">
      <div className="glass-panel border-white/5 rounded-[48px] p-10 shadow-command relative overflow-hidden">
        <div className="scanline opacity-5" />
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-[11px] font-black uppercase text-white/40 tracking-[0.4em] font-mono leading-none">
            Personnel Status
          </h4>
          <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(52,199,89,0.5)]" />
        </div>
        <div className="space-y-5 max-h-[450px] overflow-y-auto pr-3 scrollbar-hide">
          {tanods.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-10">
              <Shield className="w-16 h-16 mb-4" />
              <p className="text-[10px] text-white font-black uppercase tracking-widest font-mono text-center">
                Zero Units Detected
              </p>
            </div>
          ) : (
            tanods.map((t, index) => {
              const pMatch = patrols.find((p) => p.tanodId === t.id);
              const isOnline = pMatch?.isActive;
              const lastPing = pMatch?.lastUpdate
                ? new Date(pMatch.lastUpdate)
                : null;
              const isStale = lastPing
                ? Date.now() - lastPing.getTime() > PATROL_TIMEOUT
                : true;

              const statusColor =
                isOnline && !isStale
                  ? "bg-success"
                  : isOnline && isStale
                  ? "bg-warning"
                  : "bg-white/10";

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white/20 font-black font-mono border border-white/5",
                          statusColor + "/10"
                        )}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-brand-bg",
                          statusColor
                        )}
                      />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-white uppercase font-mono tracking-tighter">
                        {t.name}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-white/20 uppercase font-mono tracking-[0.2em]">
                          {t.status || "Active"}
                        </span>
                        {isOnline && !isStale && (
                          <span className="w-1 h-1 bg-success rounded-full animate-ping" />
                        )}
                      </div>
                    </div>
                  </div>
                  {lastPing && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-white/20 uppercase font-mono flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5" />
                        {lastPing.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
