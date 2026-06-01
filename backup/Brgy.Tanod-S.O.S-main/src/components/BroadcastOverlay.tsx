// src/components/BroadcastOverlay.tsx
import React from "react";

export default function BroadcastOverlay({
  broadcast,
  onClose,
}: {
  broadcast: any;
  onClose: () => void;
}) {
  if (!broadcast) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-red-900/90 max-w-md w-full rounded-3xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">🚨 BARANGAY BROADCAST</h3>
        <p className="text-lg">{broadcast.message}</p>
        <button
          onClick={onClose}
          className="mt-8 bg-white text-black px-8 py-3 rounded-full font-semibold"
        >
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  );
}
