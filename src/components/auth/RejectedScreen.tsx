// src/components/auth/RejectedScreen.tsx
export default function RejectedScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-center">
      <div>
        <div className="text-6xl mb-6">❌</div>
        <h2 className="text-3xl font-bold text-red-500 mb-4">
          Application Rejected
        </h2>
        <p className="text-gray-400">
          Please contact your barangay office for more information.
        </p>
      </div>
    </div>
  );
}
