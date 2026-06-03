import React, { useState, useEffect } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { Eye, Users } from "lucide-react";
import { WitnessRequest } from "../types";

interface WitnessIndicatorProps {
  alertId: string;
}

export const WitnessIndicator: React.FC<WitnessIndicatorProps> = ({
  alertId,
}) => {
  const [witnesses, setWitnesses] = useState<WitnessRequest[]>([]);

  const fetchWitnesses = async () => {
    try {
      const data = await api.generic.list(
        `witness_invites?alertId=${alertId}&status=accepted`
      );
      setWitnesses(data);
    } catch (err) {
      console.error("Failed to fetch witnesses", err);
    }
  };

  useEffect(() => {
    if (!alertId) return;
    fetchWitnesses();
    socket.on("witness_update", (payload: any) => {
      if (payload.alertId === alertId) fetchWitnesses();
    });

    return () => {
      socket.off("witness_update");
    };
  }, [alertId]);

  if (witnesses.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emergency/20 border border-emergency/30 rounded-full text-emergency">
      <Users className="w-3 h-3" />
      <span className="text-[9px] font-black uppercase tracking-widest">
        {witnesses.length} WITNESSES
      </span>
    </div>
  );
};
