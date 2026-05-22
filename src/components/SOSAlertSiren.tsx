import toast from "react-hot-toast";
// src/components/SOSAlertSiren.tsx
import React from "react";

export default function SOSAlertSiren({ userRole, onSOS }: { userRole: string; onSOS?: (data: any) => void }) {
  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Floating SOS Button - You can enhance this with drag functionality */}
      <button
        onClick={() => {
          if (onSOS) {
            onSOS({ type: "emergency", description: "Quick SOS Alert" });
          } else {
            toast("🚨 SOS ACTIVATED!");
          }
        }}
        className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full shadow-2xl flex items-center justify-center text-3xl active:scale-95 transition-all"
      >
        SOS
      </button>
    </div>
  );
}
