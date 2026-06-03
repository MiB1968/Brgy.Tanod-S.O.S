import { useState, useEffect } from "react";
import { FileText, Clock, User, Target, Server } from "lucide-react";
import { admin } from "../../lib/api";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await admin.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="text-white/40 tracking-wider">Loading audit logs...</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-darker border border-white/5 rounded-2xl p-8 text-center text-white/40 font-mono tracking-widest text-sm uppercase">
        No administrative actions logged yet.
      </div>
    );
  }

  return (
    <div className="bg-darker border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <Server className="w-5 h-5 text-tactical-cyan" />
          <h3 className="font-mono text-sm tracking-widest uppercase font-black">
            System Audit Trail
          </h3>
        </div>
        <span className="text-xs text-white/40 font-mono tracking-wider tabular-nums px-3 py-1 bg-white/5 rounded-full border border-white/10 shadow-inner">
          {logs.length} RECORDS
        </span>
      </div>

      <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto no-scrollbar">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-6 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="bg-white/5 p-2 rounded-lg border border-white/10 shrink-0">
                <FileText className="w-4 h-4 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div className="font-mono text-sm tracking-wider uppercase text-emerald-400 font-bold break-all">
                    {log.action}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40 font-mono shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min mb-4">
                  <div className="flex items-center gap-2 text-sm text-white/60 font-mono tracking-wide">
                    <User className="w-4 h-4 text-blue-400/80" />
                    <span className="truncate">
                      Admin{" "}
                      <span className="text-white">
                        UID:{log.admin_id?.substring(0, 8)}
                      </span>
                    </span>
                  </div>
                  {log.target_table && (
                    <div className="flex items-center gap-2 text-sm text-white/60 font-mono tracking-wide">
                      <Target className="w-4 h-4 text-amber-400/80" />
                      <span className="truncate">
                        TGT:{" "}
                        <span className="text-white">
                          {log.target_table}#{log.target_id?.substring(0, 8)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {log.details && (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs overflow-x-auto no-scrollbar">
                    <pre className="text-white/60 break-all whitespace-pre-wrap leading-relaxed">
                      <span className="text-tactical-cyan/40 select-none">
                        &gt;{" "}
                      </span>
                      {typeof log.details === "string"
                        ? JSON.stringify(JSON.parse(log.details), null, 2)
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
