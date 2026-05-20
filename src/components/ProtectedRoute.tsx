// src/components/ProtectedRoute.tsx
import { ReactNode } from "react";
import { useRBAC } from "../context/AuthContext";
import type { UserRole } from "../types";
import { BackgroundPattern, TanodLogo } from "./Branding";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  permission?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  permission,
  fallback,
}: ProtectedRouteProps) => {
  const { role, loading, hasPermission, canAccessRole } = useRBAC();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-white">
        <BackgroundPattern />
        <div className="relative">
          <TanodLogo size={80} animated />
          <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-white/50">
            Verifying Clearance...
          </p>
        </div>
      </div>
    );
  }

  // Without a router installed (we're mostly custom-routing via state),
  // we can just render the fallback instead of <Navigate>
  if (!role) {
    return fallback || (
      <div className="flex min-h-[50vh] items-center justify-center text-center">
        <p className="text-emergency font-mono tracking-widest">ACCESS_DENIED: NOT_AUTHENTICATED</p>
      </div>
    );
  }

  if (requiredRole && !canAccessRole(requiredRole)) {
    return fallback || (
      <div className="flex min-h-[50vh] items-center justify-center text-center">
        <p className="text-emergency font-mono tracking-widest">ACCESS_DENIED: INSUFFICIENT_CLEARANCE</p>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return fallback || (
      <div className="flex min-h-[50vh] items-center justify-center text-center">
        <p className="text-emergency font-mono tracking-widest">ACCESS_DENIED: MISSING_PERMISSION</p>
      </div>
    );
  }

  return <>{children}</>;
};
