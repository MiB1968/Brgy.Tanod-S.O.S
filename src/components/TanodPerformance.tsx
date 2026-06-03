// src/components/TanodPerformance.tsx
import { useEffect, useState } from "react";
import { Award, ShieldAlert, Zap, Hourglass, TrendingUp } from "lucide-react";
import { useTanodStore } from "../store/useTanodStore";
import { useIncidentStore } from "../store/useIncidentStore";
import { motion } from "framer-motion";

export default function TanodPerformance() {
  const { patrols, tanods, activityLogs } = useTanodStore();
  const { alerts } = useIncidentStore();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Generate leaderboard based on state store
    const list = tanods.map((tanod) => {
      // Calculate finished responses
      const responses = alerts.filter(
        (a) => a.respondedBy === tanod.id && a.status === "resolved"
      ).length;

      // Calculate shift activities from logs
      const logsCount = activityLogs.filter(
        (l) => l.tanodId === tanod.id
      ).length;

      // Calculate general performance score (0 - 100)
      const baseUptime = 20; // assumed basic patrol uptime units
      const responseWeight = responses * 15;
      const logWeight = logsCount * 5;
      const overallScore = Math.min(
        100,
        Math.max(
          70,
          75 + responseWeight + logWeight - (tanod.status === "Offline" ? 2 : 0)
        )
      );

      return {
        id: tanod.id,
        name: tanod.name || "Barangay patrol",
        sector: tanod.sector || "Tanza Sector",
        status: tanod.status || "Offline",
        responses,
        logsCount,
        score: overallScore,
      };
    });

    // Provide default fallback data if store is empty during bootstrap
    if (list.length === 0) {
      const fallbackList = [
        {
          id: "t1",
          name: "Danilo Ramos",
          sector: "Sector 1 (Poblacion)",
          status: "On Patrol",
          responses: 12,
          logsCount: 45,
          score: 98,
        },
        {
          id: "t2",
          name: "Efren Diaz",
          sector: "Sector 2 (Bagna)",
          status: "On Patrol",
          responses: 9,
          logsCount: 38,
          score: 92,
        },
        {
          id: "t3",
          name: "Juanito Cruz",
          sector: "Sector 3 (Capipisa)",
          status: "Responding",
          responses: 14,
          logsCount: 50,
          score: 95,
        },
        {
          id: "t4",
          name: "Mateo Santos",
          sector: "Sector 1 (Poblacion)",
          status: "Off-Duty",
          responses: 8,
          logsCount: 22,
          score: 87,
        },
        {
          id: "t5",
          name: "Roberto Almeda",
          sector: "Sector 4 (Santol)",
          status: "Offline",
          responses: 5,
          logsCount: 18,
          score: 81,
        },
      ];
      setLeaderboard(fallbackList.sort((a, b) => b.score - a.score));
    } else {
      setLeaderboard(list.sort((a, b) => b.score - a.score));
    }
  }, [tanods, alerts, activityLogs]);

  return (
    <div className="bg-[#0a1428] rounded-[32px] p-6 md:p-8 border border-white/10 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-2xl pointer-events-none"></div>

      {/* Header section with metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
            <Award className="text-yellow-400 w-6 h-6 animate-pulse" />
            Tanod Performance Leaderboard
          </h3>
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">
            Realtime response logs, uptime shifts, and tactical scores
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-white/5 py-1.5 px-3 rounded-full font-mono text-cyan-400">
          <TrendingUp className="w-3.5 h-3.5" />
          SYSTEM_OPTIMIZED: ACTIVE_DUTY
        </div>
      </div>

      <div className="space-y-4">
        {leaderboard.map((t, i) => {
          // Status Color Badge
          let statusColor = "bg-gray-500";
          if (t.status === "On Patrol") statusColor = "bg-green-500";
          else if (t.status === "Responding")
            statusColor = "bg-yellow-500 animate-pulse";
          else if (t.status === "Available") statusColor = "bg-blue-500";

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={t.id}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-900/45 border border-white/5 hover:border-cyan-500/20 rounded-2xl transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Ranking Medallion */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black font-mono shadow text-sm border ${
                    i === 0
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-400"
                      : i === 1
                      ? "bg-slate-300/10 border-slate-300 text-slate-300"
                      : i === 2
                      ? "bg-amber-600/10 border-amber-500 text-amber-500"
                      : "bg-slate-800/50 border-white/10 text-slate-400"
                  }`}
                >
                  #{i + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {t.name}
                    </p>
                    <span
                      className={`w-2 h-2 rounded-full ${statusColor}`}
                      title={t.status}
                    />
                  </div>
                  <p className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">
                    {t.sector}
                  </p>
                </div>
              </div>

              {/* Uptime and response statistics summary */}
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-white/5 font-mono text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>{t.responses} res.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.logsCount} logs</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest text-right">
                    Duty Score
                  </span>
                  <span
                    className={`font-black text-lg ${
                      t.score >= 90 ? "text-green-400" : "text-yellow-400"
                    }`}
                  >
                    {t.score}%
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
