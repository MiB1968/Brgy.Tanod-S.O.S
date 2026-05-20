// src/components/BackgroundServices.tsx
import React, { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { tanodLocationService } from "../services/tanodLocationService";

export default function BackgroundServices() {
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    if (profile && (profile.role === "tanod" || (profile.role as string) === "responder")) {
      tanodLocationService.setupVisibilityHandler();
      tanodLocationService.startTracking();
    } else {
      tanodLocationService.stopTracking();
    }

    return () => {
      tanodLocationService.stopTracking();
    };
  }, [profile]);

  return null;
}
