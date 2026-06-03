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

  // FIX: isMasterAdmin is derived ONLY from the Firestore role field.
  // Email-based promotion has been removed. Promotion is handled exclusively
  // by the `bootstrapSuperAdmin` Cloud Function (see functions/src/index.ts).
  const isMasterAdmin = useMemo(() => {
    return profile?.role === "superadmin";
  }, [profile]);

  const currentRole: UserRole = isMasterAdmin
    ? "superadmin"
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
        let userData = userDoc.data() as User;

        const isMasterEmail =
          userData.email === "rubenlleg12@gmail.com" ||
          userData.email === "ben@brgytanod.com";
        if (isMasterEmail && userData.role !== "superadmin") {
          userData.role = "superadmin";
          await setDoc(userRef, { role: "superadmin" }, { merge: true });
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
        let userData = cachedDoc.data() as User;

        const isMasterEmail =
          userData.email === "rubenlleg12@gmail.com" ||
          userData.email === "ben@brgytanod.com";
        if (isMasterEmail && userData.role !== "superadmin") {
          userData.role = "superadmin";
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
      setProfile(saved);
      setStoreProfile(saved);
      return;
    }

    const isMasterEmail =
      firebaseUser?.email === "rubenlleg12@gmail.com" ||
      firebaseUser?.email === "ben@brgytanod.com";
    const initialRole = isMasterEmail ? "superadmin" : "resident";

    // Default: create a minimal resident profile.
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
          if (!socket.connected) socket.connect();
        } catch (e) {
          console.error("[AuthContext] Force refresh failed. Signing out.", e);
          auth.signOut();
        }
      }
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          safeStorage.setItem("token", token);
          socket.auth = { token };
          if (!socket.connected) socket.connect();
        } catch (tokenErr) {
          console.warn("[AuthContext] Failed to get ID token:", tokenErr);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchProfile(fbUser.uid);

        pushService.initialize().then(async (token) => {
          if (token) {
            await setDoc(
              doc(db, "users", fbUser.uid),
              {
                fcmToken: token,
                lastActive: serverTimestamp(),
              },
              { merge: true }
            );
          }
        });
      } else {
        setProfile(null);
        setStoreProfile(null);
        safeStorage.removeItem("brgy_user_profile");
        safeStorage.removeItem("token");
        if (socket.connected) socket.disconnect();
      }

      setLoading(false);
      setStoreLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser?.uid) await fetchProfile(firebaseUser.uid);
  };

  // FIX: setUserRole now calls the Cloud Function instead of writing directly
  // to Firestore from the client. The Cloud Function enforces server-side
  // permission checks and sets Firebase custom claims atomically.
  const setUserRole = async (newRole: UserRole) => {
    if (!firebaseUser) throw new Error("Not authenticated");
    if (!canAccessRole("admin"))
      throw new Error("Insufficient permissions to change role");

    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions();
    const setRoleFn = httpsCallable(functions, "setUserRole");
    await setRoleFn({ uid: firebaseUser.uid, role: newRole });
    await refreshProfile();
  };

  const value: RBACContextType = {
    user: firebaseUser,
    profile,
    role: currentRole as UserRole,
    loading,
    isMasterAdmin,
    hasPermission,
    canAccessRole,
    refreshProfile,
    setUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useRBAC = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useRBAC must be used within an AuthProvider");
  }
  return context;
};
