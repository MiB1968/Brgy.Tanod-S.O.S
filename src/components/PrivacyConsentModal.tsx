import toast from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

interface PrivacyConsentModalProps {
  onAccept: () => void;
}

export default function PrivacyConsentModal({
  onAccept,
}: PrivacyConsentModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (
      profile &&
      (profile.role === "tanod" || (profile.role as string) === "responder")
    ) {
      const consent = localStorage.getItem(
        "brgy_tanod_location_consent_granted"
      );
      if (consent !== "true") {
        setIsOpen(true);
      }
    }
  }, [profile]);

  const handleAccept = () => {
    localStorage.setItem("brgy_tanod_location_consent_granted", "true");
    setIsOpen(false);
    onAccept();
  };

  const handleDecline = () => {
    setIsOpen(false);
    // Optionally alert the user that tracking maintains inactive until they accept
    toast(
      "Location tracking is required for active Tanod/responder duty. Real-time dispatch and patrol history features will remain disabled on this device until consent is granted."
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in"
      id="privacy-consent-modal"
    >
      <div className="bg-[#0a1428] border border-red-500/30 rounded-2xl max-w-md w-full p-8 text-white shadow-2xl relative">
        <div className="text-3xl mb-4 font-bold flex items-center gap-2 text-red-500">
          <span>📍</span> Location Tracking
        </div>

        <h2 className="text-xl font-bold mb-4 tracking-tight">
          Tanod Tactical Duty Consent
        </h2>

        <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
          <p>
            Barangay Tanod S.O.S. gathers device location data{" "}
            <strong>while you are on duty</strong> to enable:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li>
              Display of your live tactical position on the Command Center Map.
            </li>
            <li>
              Instant dispatching based on proximity to active citizen
              emergencies.
            </li>
            <li>
              Accurate reporting of patrol route coverage logs for community
              safety.
            </li>
          </ul>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-300 text-xs mt-2">
            ⚠️ <strong>Data Privacy Guarantee:</strong> Your real-time position
            data is strictly shared with authorized Barangay command
            administrators and patrols. We never sell or share your location
            logs.
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleDecline}
            id="privacy-decline-btn"
            className="flex-1 py-3 border border-gray-700 rounded-xl hover:bg-gray-900 transition text-sm cursor-pointer font-medium text-gray-400"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            id="privacy-accept-btn"
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition text-sm cursor-pointer text-white"
          >
            Accept & Track
          </button>
        </div>
      </div>
    </div>
  );
}
