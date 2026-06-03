import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { tanodLocationService } from "../services/tanodLocationService";
import PrivacyConsentModal from "./PrivacyConsentModal";

export default function BackgroundServices() {
  const profile = useAuthStore((state) => state.profile);
  const [hasConsent, setHasConsent] = useState(() => {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem("brgy_tanod_location_consent_granted") === "true"
    );
  });

  useEffect(() => {
    if (
      profile &&
      (profile.role === "tanod" || (profile.role as string) === "responder")
    ) {
      tanodLocationService.setupVisibilityHandler();
      if (hasConsent) {
        tanodLocationService.startTracking();
      }
    } else {
      tanodLocationService.stopTracking();
    }

    return () => {
      tanodLocationService.stopTracking();
    };
  }, [profile, hasConsent]);

  const handleConsentAccepted = () => {
    setHasConsent(true);
  };

  return (
    <>
      <PrivacyConsentModal onAccept={handleConsentAccepted} />
    </>
  );
}
