import { useEffect, useState, useMemo } from "react";
import { Users, Shield, ShieldAlert, Clock } from "lucide-react";
import { generic, residents } from "../../lib/api";

export default function RoleStatsCards() {
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalTanods: 0,
    totalResidents: 0,
    pendingVerifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersList = await generic.list("users");
        const residentsList = await residents.getAll();

        let admins = 0;
        let tanods = 0;
        let pending = 0;
        let activeResidents = 0;

        usersList.forEach((u: any) => {
          if (u.role === "admin") admins++;
          if (u.role === "tanod") tanods++;
          if (u.role === "resident" && u.status === "active") activeResidents++;
        });

        residentsList.forEach((r: any) => {
          if (r.status === "pending") pending++;
        });

        const newStats = {
          totalAdmins: admins,
          totalTanods: tanods,
          totalResidents: activeResidents,
          pendingVerifications: pending,
        };

        setStats(newStats);
        sessionStorage.setItem("adminStats", JSON.stringify(newStats));
      } catch (err) {
        console.error("Failed to fetch stats for cards:", err);
      } finally {
        setLoading(false);
      }
    };

    const cached = sessionStorage.getItem("adminStats");
    if (cached) {
      try {
        setStats(JSON.parse(cached));
        setLoading(false);
      } catch (e) {
        // ignore
      }
    }

    fetchStats();
  }, []);

  const cards = useMemo(() => {
    return [
      {
        label: "Command",
        value: stats.totalAdmins,
        icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
        color: "text-white",
      },
      {
        label: "Active Tanods",
        value: stats.totalTanods,
        icon: <Shield className="w-5 h-5 text-blue-500" />,
        color: "text-white",
      },
      {
        label: "Residents",
        value: stats.totalResidents,
        icon: <Users className="w-5 h-5 text-emerald-500" />,
        color: "text-white",
      },
      {
        label: "Pending Queue",
        value: stats.pendingVerifications,
        icon: <Clock className="w-5 h-5 text-tactical-cyan" />,
        color: "text-tactical-cyan",
      },
    ];
  }, [stats]);

  if (loading && stats.totalAdmins === 0 && stats.totalResidents === 0) {
    return (
      <div className="text-white/40 tracking-wider">
        Loading system statistics...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-darker border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-white/60 font-mono text-sm tracking-wider uppercase">
              {card.label}
            </div>
            {card.icon}
          </div>
          <div className={`text-3xl font-black ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
