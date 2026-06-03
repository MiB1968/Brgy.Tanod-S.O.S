// src/components/auth/PendingApproval.tsx
export default function PendingApproval() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-center">
      <div>
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-3xl font-bold mb-4">Application Pending</h2>
        <p className="text-gray-400 max-w-sm mx-auto">
          Your account is under review by the barangay admin.
          <br />
          You will be notified once approved.
        </p>
      </div>
    </div>
  );
}
