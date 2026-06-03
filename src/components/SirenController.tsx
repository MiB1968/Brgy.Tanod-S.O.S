import { useEffect, useRef } from "react";
import { Howl } from "howler";
import { User, Alert, AlertStatus } from "../types";

// Siren sound
export const siren = new Howl({
  src: ["https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3"], // Emergency siren
  loop: true,
  volume: 0.5,
});

interface SirenControllerProps {
  globalSirenActive: boolean;
  profile: User | null;
  alerts: Alert[];
}

export default function SirenController({
  globalSirenActive,
  profile,
  alerts,
}: SirenControllerProps) {
  const lastAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Alert sound logic
    if (globalSirenActive) {
      if (!siren.playing()) {
        siren.volume(1.0);
        siren.play();
      }
      return;
    }

    if (
      !profile ||
      (profile.role !== "tanod" &&
        profile.role !== "admin" &&
        profile.role !== "superadmin")
    ) {
      siren.stop();
      return;
    }

    const pendingAlerts = alerts.filter(
      (a) => a.status?.toLowerCase() === "pending"
    );
    const newestAlert = pendingAlerts[0]; // Alerts are usually sorted DESC by created_at

    if (newestAlert) {
      const isNew = newestAlert.id !== lastAlertIdRef.current;

      if (isNew || !siren.playing()) {
        lastAlertIdRef.current = newestAlert.id;

        // Force play on new alert
        siren.stop();
        siren.volume(1.0);
        siren.play();

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }

        // Auto-stop after 15 seconds to avoid annoyance, unless global siren is on
        const timer = setTimeout(() => {
          if (!globalSirenActive) siren.fade(1.0, 0, 2000);
          setTimeout(() => {
            if (!globalSirenActive) siren.stop();
          }, 2000);
        }, 15000);

        return () => clearTimeout(timer);
      }
    } else {
      siren.stop();
      lastAlertIdRef.current = null;
    }

    return () => {
      if (!globalSirenActive) siren.stop();
    };
  }, [alerts, profile?.role, globalSirenActive]);

  return null;
}
