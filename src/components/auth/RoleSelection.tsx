// src/components/auth/RoleSelection.tsx
import React from "react";

interface RoleSelectionProps {
  onSelectRole: (role: "resident" | "tanod" | "admin") => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-3xl font-bold mb-8">Choose Your Role</h2>

        <div className="space-y-4">
          <button
            onClick={() => onSelectRole("resident")}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-2">🏠</div>
            <div className="font-semibold text-lg">Resident</div>
            <p className="text-sm text-gray-400">
              Report emergencies and receive alerts
            </p>
          </button>

          <button
            onClick={() => onSelectRole("tanod")}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-2">🛡️</div>
            <div className="font-semibold text-lg">Tanod</div>
            <p className="text-sm text-gray-400">
              Patrol and respond to incidents
            </p>
          </button>

          <button
            onClick={() => onSelectRole("admin")}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-semibold text-lg">Admin</div>
            <p className="text-sm text-gray-400">Manage system and users</p>
          </button>
        </div>
      </div>
    </div>
  );
}
