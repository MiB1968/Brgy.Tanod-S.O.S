// src/components/Admin/ManageUsers.tsx
import { useState, useEffect } from "react";
import * as api from "../../lib/api";
import socket from "../../lib/socket";
import { User } from "../../types";
import {
  Users,
  Search,
  Filter,
  Mail,
  Clock,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Send,
  ArrowUpDown,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

import { useAuthStore } from "../../store/useAuthStore";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useRoleUpdate } from "../../hooks/useRoleUpdate";

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "admin" | "superadmin" | "tanod" | "resident"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "verified" | "suspended"
  >("all");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { profile } = useAuthStore();
  const { execute, loading: actionLoading } = useAsyncAction();
  const { updateRole, loading: updatingRole } = useRoleUpdate();

  // Combine updating logic
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      toast.error("Failed to retrieve central operator registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    socket.on("resident_update", loadUsers);
    socket.on("tanod_update", loadUsers);

    return () => {
      socket.off("resident_update", loadUsers);
      socket.off("tanod_update", loadUsers);
    };
  }, []);

  const handleResendWelcome = async (userId: string, userName: string) => {
    setResendingId(userId);
    await execute(() => api.admin.resendWelcomeEmail(userId), {
      successMessage: `Security passcode resent to ${userName}!`,
    });
    setResendingId(null);
  };

  const handleRoleChange = async (
    userId: string,
    newRole: string,
    userName: string
  ) => {
    setUpdatingId(userId);
    if (!navigator.onLine) {
      try {
        const { db } = await import("../../db/offlineDB");
        await db.queuedActions.add({
          type: "update_role",
          payload: { userId, role: newRole },
          timestamp: Date.now(),
          retryCount: 0,
        });
        toast.success(
          `Action saved offline: ${userName} to ${newRole.toUpperCase()}`
        );
        setUpdatingId(null);
        return;
      } catch (err) {
        toast.error("Failed to queue offline role change");
        setUpdatingId(null);
        return;
      }
    }

    try {
      await updateRole(userId, newRole, userName);
      const typedRole = newRole as any;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: typedRole } : u))
      );
      socket.emit("tanod_update", {});
      socket.emit("resident_update", {});
    } catch (e) {
      // Handled in hook
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: string,
    userName: string
  ) => {
    setUpdatingId(userId);
    if (!navigator.onLine) {
      try {
        const { db } = await import("../../db/offlineDB");
        await db.queuedActions.add({
          type: "update_status",
          payload: { userId, status: newStatus },
          timestamp: Date.now(),
          retryCount: 0,
        });
        toast.success(
          `Action saved offline: Status for ${userName} to ${newStatus.toUpperCase()}`
        );
        setUpdatingId(null);
        return;
      } catch (err) {
        toast.error("Failed to queue offline status change");
        setUpdatingId(null);
        return;
      }
    }

    await execute(() => api.admin.updateUserStatus(userId, newStatus), {
      successMessage: `Access status for ${userName} modified to ${newStatus.toUpperCase()}`,
      onSuccess: () => {
        const typedStatus = newStatus as any;
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: typedStatus } : u))
        );
        socket.emit("resident_update", {});
      },
    });
    setUpdatingId(null);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!navigator.onLine) {
      try {
        const { db } = await import("../../db/offlineDB");
        await db.queuedActions.add({
          type: "revoke_access",
          payload: { userId },
          timestamp: Date.now(),
          retryCount: 0,
        });
        toast.success(`Action saved offline: Operator ${userName} purged`);
        setDeletingId(null);
        return;
      } catch (err) {
        toast.error("Failed to queue offline delete action");
        setDeletingId(null);
        return;
      }
    }

    await execute(() => api.admin.deleteUser(userId), {
      successMessage: `Operator ${userName} purged from security framework`,
      onSuccess: () => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setDeletingId(null);
        socket.emit("tanod_update", {});
        socket.emit("resident_update", {});
      },
    });
  };

  // Helper function to format the Last Login / Last Active timestamp nicely
  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return "Never Ingressed";

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // If under 1 minute, they are online now
    if (diffMs < 60000) return "Online Now 🟢";

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Shield className="w-4.5 h-4.5 text-rose-500 animate-glow" />;
      case "admin":
        return <Shield className="w-4 h-4 text-tactical-cyan" />;
      case "tanod":
        return <UserCheck className="w-4 h-4 text-[#10B981]" />;
      case "resident":
      default:
        return <Users className="w-4 h-4 text-white/50" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "admin":
        return "bg-tactical-cyan/10 text-tactical-cyan border-tactical-cyan/20";
      case "tanod":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "resident":
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "verified":
      case "approved":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
      case "pending":
        return "bg-amber-500/15 text-amber-500 border-amber-500/25 animate-pulse";
      case "suspended":
        return "bg-red-500/15 text-red-400 border-red-500/25";
      default:
        return "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";
    }
  };

  // Perform client-side user queries & filters
  const filteredUsers = (Array.isArray(users) ? users : []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ? true : user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-2">
            <Users className="w-5 h-5 text-tactical-cyan" />
            Central User & Operator Registry
          </h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
            Review security credentials, update access clearances, and resend
            welcoming authorization passcode logs on-demand
          </p>
        </div>

        {/* Tactical filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#161920] border border-white/10 rounded-2xl p-1.5 gap-1.5 shadow-md">
            {(["all", "admin", "tanod", "resident"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  roleFilter === role
                    ? "bg-tactical-cyan text-black font-extrabold shadow"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {role}s
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-[#161920] border border-white/10 rounded-2xl py-2 px-4 text-[9px] uppercase tracking-wider font-mono font-black text-white/80 outline-none focus:border-tactical-cyan/40"
          >
            <option value="all">ANY ACCESS STATE</option>
            <option value="verified">VERIFIED / APPROVED</option>
            <option value="pending">PENDING CLEARANCE</option>
            <option value="suspended">SUSPENDED OPERATORS</option>
          </select>

          <button
            onClick={loadUsers}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/70 hover:text-white active:scale-95 transition-all shadow"
            title="Reload registry database"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading ? "animate-spin text-tactical-cyan" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Query search input box */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="QUERY CENTRAL REGISTRY BY NAME, USER EMAIL OR UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-tactical-cyan/50 transition-all text-white placeholder-white/20"
        />
      </div>

      {/* Main Operator List & Grid */}
      <div className="tactical-panel bg-white/[0.01] border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/5 bg-black/45 text-[8.5px] font-mono tracking-widest uppercase font-black text-white/40">
                <th className="py-5 px-6">
                  System Operator & Communication Tier
                </th>
                <th className="py-5 px-4">Role Clearance</th>
                <th className="py-5 px-4">Security Access Status</th>
                <th className="py-5 px-4">Registry Created</th>
                <th className="py-5 px-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/20" /> Last Active
                  login
                </th>
                <th className="py-5 px-6 text-right">
                  Emergency Handshake & Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="w-10 h-10 border-2 border-tactical-cyan/20 border-t-tactical-cyan rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] font-black text-white/20">
                      Accessing secure databases...
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-black text-white/20">
                      No registered security records fit query
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors relative group"
                  >
                    {/* Identity Column */}
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center shrink-0">
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#E2E8F0] tracking-tight uppercase group-hover:text-tactical-cyan transition-colors truncate max-w-[200px]">
                            {user.name}
                          </h4>
                          <span
                            className="text-[9px] text-[#8A95A5] font-mono mt-0.5 truncate block max-w-[200px]"
                            title={user.email}
                          >
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role clearance update tier column */}
                    <td className="py-5 px-4">
                      {user.role === "superadmin" ? (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[8.5px] font-mono font-black uppercase border ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          SUPER ADMIN
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value, user.name)
                          }
                          className={`bg-black/50 border rounded-lg text-[9px] font-mono font-bold uppercase py-1.5 px-3 block outline-none cursor-pointer focus:border-tactical-cyan/40 transition-colors ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          <option value="resident">RESIDENT clearances</option>
                          <option value="tanod">TANOD officer</option>
                          <option value="admin">CENTRAL ADMIN</option>
                        </select>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-5 px-4">
                      <select
                        value={user.status}
                        disabled={updatingId === user.id}
                        onChange={(e) =>
                          handleStatusChange(user.id, e.target.value, user.name)
                        }
                        className={`bg-black/50 border rounded-lg text-[9px] font-mono font-bold uppercase py-1.5 px-3 block outline-none cursor-pointer focus:border-tactical-cyan/40 transition-colors ${getStatusBadgeClass(
                          user.status
                        )}`}
                      >
                        <option value="pending">PENDING Access</option>
                        <option value="verified">VERIFIED User</option>
                        <option value="suspended">SUSPENDED Log</option>
                      </select>
                    </td>

                    {/* Creation timestamp column */}
                    <td className="py-5 px-4 font-mono text-[10px] text-white/40">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </td>

                    {/* Last active login column with custom coloring based on action */}
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.lastActive &&
                            new Date().getTime() -
                              new Date(user.lastActive).getTime() <
                              600000
                              ? "bg-emerald-400 animate-ping"
                              : "bg-white/10"
                          }`}
                        />
                        <span
                          className={`font-mono text-[10px] uppercase font-bold tracking-tight ${
                            user.lastActive &&
                            new Date().getTime() -
                              new Date(user.lastActive).getTime() <
                              600000
                              ? "text-emerald-400 font-extrabold"
                              : "text-white/50"
                          }`}
                        >
                          {formatLastActive(user.lastActive)}
                        </span>
                      </div>
                    </td>

                    {/* Quick Resend / Purge Action buttons */}
                    <td className="py-5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* Resend passcode button with dynamic status spinner loading state */}
                        <button
                          onClick={() =>
                            handleResendWelcome(user.id, user.name)
                          }
                          disabled={resendingId === user.id}
                          className="px-3.5 py-1.8 hover:scale-[1.01] active:scale-95 bg-tactical-cyan/10 border border-tactical-cyan/35 text-tactical-cyan hover:bg-tactical-cyan/20 rounded-xl text-[8.5px] font-mono font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          title="Generate new temporary credential block and resend welcome email"
                        >
                          <Send
                            className={`w-3 h-3 ${
                              resendingId === user.id
                                ? "animate-ping text-tactical-cyan"
                                : ""
                            }`}
                          />
                          Resend Passcode
                        </button>

                        {/* PURGE account safety confirmation toggle */}
                        <AnimatePresence mode="popLayout">
                          {deletingId === user.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-red-950/40 border border-red-500/40 p-0.5 rounded-xl text-[8.5px]">
                              <button
                                onClick={() =>
                                  handleDeleteUser(user.id, user.name)
                                }
                                className="px-2.5 py-1 text-red-400 font-mono font-black uppercase hover:bg-red-500/20 rounded-lg cursor-pointer"
                              >
                                CONFIRM PURGE
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-2.5 py-1 text-white/55 font-mono font-bold uppercase hover:bg-white/5 rounded-lg cursor-pointer"
                              >
                                CLOSE
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(user.id)}
                              disabled={updatingId === user.id}
                              className="p-2 border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                              title="Decommission system terminal account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
