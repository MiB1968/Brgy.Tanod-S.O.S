// src/components/auth/Unauthorized.tsx
export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-gray-400">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}
