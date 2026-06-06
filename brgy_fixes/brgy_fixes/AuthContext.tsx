/**
 * src/context/AuthContext.tsx
 *
 * FIX BATCH — CRIT-01 (client-side / AuthContext)
 *
 * Changes from original:
 *   Every occurrence of the hardcoded check
 *     `email === "rubenlleg12@gmail.com"`
 *   has been removed. Role derivation now comes exclusively from:
 *     1. profile?.role === "super_admin"  (set by the server via Firestore)
 *     2. VITE_MASTER_EMAILS env var (build-time, for the self-healing fallback)
 *
 *   The self-healing logic that writes `role: 'super_admin'` back to Firestore
 *   is retained — but it now only fires for emails listed in VITE_MASTER_EMAILS,
 *   not for any hardcoded personal email.
 *
 * All other logic (socket reconnection, profile fetch waterfall, Firebase auth
 * state listener) is unchanged.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import * as safeStorage from "../lib/safeStorage";
import socket from "../lib/socket";
import { pushService } from "../services/pushNotificationService";
import type { User, UserRole } from "../types";
import { RoleHierarchy, RolePermissions } from "../types";
import { useAuthStore } from "../store/useAuthStore";

// ---------------------------------------------------------------------------
// Master admin emails are read from the environment at build time.
// Set VITE_MASTER_EMAILS=email1@example.com,email2@example.com in your .env
// NEVER hardcode real email addresses in source code.
// ---------------------------------------------------------------------------
const MASTER_EMAILS: string[] = (import.meta.env.VITE_MASTER_EMAILS ?? "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

// CRIT-01 FIX: Helper returns true only for VITE_MASTER_EMAILS — no hardcoded address.
function isInMasterEmailList(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return MASTER_EMAILS.length > 0 && MASTER_EMAILS.includes(normalized);
}

interface RBACContextType {
  user: FirebaseUser | null;
  profile: User | null;
  role: UserRole;
  loading: boolean;
  isMasterAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  canAccessRole: (requiredRole: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
  setUserRole: (newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<RBACContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setStoreProfile = useAuthStore((state) => state.setProfile);
  const setStoreLoading = useAuthStore((state) => state.setIsLoading);

  // FIX: Reduced from 15 000 ms → 5 000 ms. 15 s is too long for a safety app.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setStoreLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // CRIT-01 FIX: isMasterAdmin derived from role field or VITE_MASTER_EMAILS only.
  const isMasterAdmin = useMemo(() => {
    const email =
      firebaseUser?.email?.toLowerCase().trim() ||
      profile?.email?.toLowerCase().trim();
    const isMasterEmail = isInMasterEmailList(email);
    return profile?.role === "super_admin" || isMasterEmail;
  }, [profile, firebaseUser]);

  const currentRole: UserRole = isMasterAdmin
    ? "super_admin"
    : profile?.role || "guest";

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isMasterAdmin) return true;
      const userPerms = RolePermissions[currentRole] || [];
      return userPerms.includes("*") || userPerms.includes(permission);
    },
    [currentRole, isMasterAdmin]
  );

  const canAccessRole = useCallback(
    (requiredRole: UserRole): boolean => {
      if (isMasterAdmin) return true;
      return (RoleHierarchy[currentRole] || 0) >= RoleHierarchy[requiredRole];
    },
    [currentRole, isMasterAdmin]
  );

  const fetchProfile = async (uid: string) => {
    const userRef = doc(db, "users", uid);

    // Primary: live Firestore fetch with 7 s timeout
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 7000)
      );

      const userDoc = (await Promise.race([
        getDoc(userRef),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof getDoc>>;

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const email =
          firebaseUser?.email?.toLowerCase().trim() ||
          userData.email?.toLowerCase().trim() ||
          "";

        // CRIT-01 FIX: Only self-heal if email is in VITE_MASTER_EMAILS env var.
        const isMaster = isInMasterEmailList(email);
        if (isMaster && userData.role !== "super_admin") {
          userData.role = "super_admin";
          try {
            await setDoc(userRef, { role: "super_admin" }, { merge: true });
          } catch (err) {
            console.error(
              "[AuthContext] Failed to save self-healed super_admin role to Firestore:",
              err
            );
          }
        }

        setProfile(userData);
        setStoreProfile(userData);
        safeStorage.setItem("brgy_user_profile", JSON.stringify(userData));
        return;
      }
    } catch (e) {
      console.warn("[AuthContext] Primary fetch failed:", e);
    }

    // Fallback 1: Firestore local cache
    try {
      const cachedDoc = await getDocFromCache(userRef);
      if (cachedDoc.exists()) {
        const userData = cachedDoc.data() as User;
        const email =
          firebaseUser?.email?.toLowerCase().trim() ||
          userData.email?.toLowerCase().trim() ||
          "";

        // CRIT-01 FIX: env var only
        const isMaster = isInMasterEmailList(email);
        if (isMaster && userData.role !== "super_admin") {
          userData.role = "super_admin";
        }

        setProfile(userData);
        setStoreProfile(userData);
        safeStorage.setItem("brgy_user_profile", JSON.stringify(userData));
        return;
      }
    } catch (ce) {
      console.warn("[AuthContext] Cache fetch failed:", ce);
    }

    // Fallback 2: localStorage
    const local = safeStorage.getItem("brgy_user_profile");
    if (local) {
      const saved = JSON.parse(local) as User;
      const email =
        firebaseUser?.email?.toLowerCase().trim() ||
        saved.email?.toLowerCase().trim() ||
        "";

      // CRIT-01 FIX: env var only
      const isMaster = isInMasterEmailList(email);
      if (isMaster && saved.role !== "super_admin") {
        saved.role = "super_admin";
      }

      setProfile(saved);
      setStoreProfile(saved);
      return;
    }

    // Default: create a minimal profile.
    const emailInput = firebaseUser?.email?.toLowerCase().trim() || "";
    // CRIT-01 FIX: env var only
    const isMasterEmail = isInMasterEmailList(emailInput);
    const initialRole = isMasterEmail ? "super_admin" : "resident";

    const userData: User = {
      id: uid,
      uid,
      name:
        firebaseUser?.displayName ||
        (isMasterEmail ? "Super Admin" : "Barangay Resident"),
      email: firebaseUser?.email || "",
      role: initialRole,
      status: "approved",
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, userData, { merge: true });
    setProfile(userData);
    setStoreProfile(userData);
  };

  useEffect(() => {
    const handleAuthExpired = async () => {
      if (auth.currentUser) {
        try {
          console.warn(
            "[AuthContext] Token expired — attempting force refresh..."
          );
          const token = await auth.currentUser.getIdToken(true);
          safeStorage.setItem("token", token);
          socket.auth = { token };
        } catch (err) {
          console.error("[AuthContext] Force refresh failed:", err);
        }
      }
    };

    window.addEventListener("auth:token_expired", handleAuthExpired);
    return () =>
      window.removeEventListener("auth:token_expired", handleAuthExpired);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser.uid);
        try {
          const token = await fbUser.getIdToken();
          safeStorage.setItem("token", token);
          if (socket && socket.auth !== undefined) {
            socket.auth = { token };
          }
        } catch (err) {
          console.warn("[AuthContext] Could not get ID token:", err);
        }
      } else {
        setProfile(null);
        setStoreProfile(null);
        safeStorage.removeItem("brgy_user_profile");
        safeStorage.removeItem("token");
      }
      setLoading(false);
      setStoreLoading(false);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser.uid);
    }
  }, [firebaseUser]);

  const setUserRole = useCallback(
    async (newRole: UserRole) => {
      if (!firebaseUser || !profile) return;
      const userRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userRef, { role: newRole }, { merge: true });
      setProfile((prev) => (prev ? { ...prev, role: newRole } : prev));
    },
    [firebaseUser, profile]
  );

  const value = useMemo(
    () => ({
      user: firebaseUser,
      profile,
      role: currentRole,
      loading,
      isMasterAdmin,
      hasPermission,
      canAccessRole,
      refreshProfile,
      setUserRole,
    }),
    [
      firebaseUser,
      profile,
      currentRole,
      loading,
      isMasterAdmin,
      hasPermission,
      canAccessRole,
      refreshProfile,
      setUserRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): RBACContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
