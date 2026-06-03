import React, { useEffect } from "react";
import { MapPin, CheckCircle } from "lucide-react";
import { Alert } from "../../types";

export const EmergencyAlertBanner = ({
  activeIncident,
  onAcknowledge,
}: {
  activeIncident: Alert | null;
  onAcknowledge: () => void;
}) => {
  useEffect(() => {
    if (activeIncident) {
      const msg = new SpeechSynthesisUtterance(
        `Emergency Alert: ${activeIncident.type} in ${
          activeIncident.description || "unspecified location"
        }`
      );
      window.speechSynthesis.speak(msg);
    }
  }, [activeIncident]);

  if (!activeIncident) return null;

  return (
    <div className="fixed inset-0 z-[9999] w-full h-fit bg-red-600 text-white p-5 text-center shadow-2xl animate-[slideIn_0.5s_ease-out_forwards,flash_1s_infinite]">
      <div className="max-w-[600px] mx-auto">
        <h1 className="text-3xl font-black mb-2 uppercase tracking-widest">
          🚨 EMERGENCY DETECTED
        </h1>

        <div className="bg-black/30 p-4 rounded-xl">
          <p className="text-xl font-bold my-1">
            <strong>TYPE:</strong> {activeIncident.type.toUpperCase()}
          </p>
          <p className="text-lg my-1">
            <strong>DETAIL:</strong> {activeIncident.description}
          </p>
          <p className="text-sm mt-2 opacity-90">
            Reporter: {activeIncident.residentName} •{" "}
            {new Date(activeIncident.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <div className="mt-5 flex gap-3 justify-center">
          <button
            onClick={() =>
              window.open(
                `https://www.google.com/maps?q=${activeIncident.location?.lat},${activeIncident.location?.lng}`
              )
            }
            className="px-6 py-3 font-bold bg-black/50 text-white rounded-lg flex items-center gap-2 hover:bg-black/70 transition"
          >
            <MapPin className="w-4 h-4" /> OPEN MAP
          </button>
          <button
            className="px-6 py-3 font-bold bg-white text-red-600 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition"
            onClick={onAcknowledge}
          >
            <CheckCircle className="w-4 h-4" /> ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};
