import React, { useState, useEffect } from "react";
import * as api from "../../lib/api";
import socket from "../../lib/socket";
import { SystemBroadcast } from "../../types";
import { Megaphone, Check, X, AlertTriangle } from "lucide-react";

export function BroadcastReview() {
  const [pendingBroadcasts, setPendingBroadcasts] = useState<SystemBroadcast[]>(
    []
  );

  const loadPending = async () => {
    try {
      const data = await api.generic.list("system_messages");
      setPendingBroadcasts(
        data.filter((b: any) => b.approval_status === "pending")
      );
    } catch (err) {
      console.error("Failed to load pending broadcasts", err);
    }
  };

  useEffect(() => {
    loadPending();
    socket.on("broadcast_update", loadPending);
    return () => {
      socket.off("broadcast_update", loadPending);
    };
  }, []);

  const approveBroadcast = async (b: SystemBroadcast) => {
    try {
      await api.generic.update(`system_messages/${b.id}`, {
        approvalStatus: "approved",
        isActive: true,
      });
    } catch (err) {
      console.error("Failed to approve broadcast", err);
    }
  };

  const rejectBroadcast = async (b: SystemBroadcast) => {
    try {
      await api.generic.update(`system_messages/${b.id}`, {
        approvalStatus: "rejected",
      });
    } catch (err) {
      console.error("Failed to reject broadcast", err);
    }
  };

  if (pendingBroadcasts.length === 0) return null;

  return (
    <div className="bg-[#252932] p-6 rounded-3xl space-y-4">
      <h3 className="text-white font-black uppercase text-sm flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" /> Pending Broadcast
        Reviews ({pendingBroadcasts.length})
      </h3>
      <div className="space-y-3">
        {pendingBroadcasts.map((b) => (
          <div key={b.id} className="bg-[#1A1D23] p-4 rounded-xl space-y-2">
            <p className="text-white text-sm">{b.message}</p>
            {b.aiRecommendation && (
              <div className="text-xs text-gray-400 bg-black/30 p-2 rounded">
                AI Reason: {b.aiRecommendation.reason}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => approveBroadcast(b)}
                className="flex-1 py-2 bg-green-600 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => rejectBroadcast(b)}
                className="flex-1 py-2 bg-red-600 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
