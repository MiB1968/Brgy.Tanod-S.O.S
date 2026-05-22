import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import * as safeStorage from '../lib/safeStorage';
import type { User, UserRole } from '../types';
import { RoleHierarchy, RolePermissions } from '../types';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Failsafe timeout for rbac loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const isMasterAdmin = useMemo(() => {
    const pEmail = profile?.email?.toLowerCase();
    const fEmail = firebaseUser?.email?.toLowerCase();
    return (
      pEmail === "rubenlleg12@gmail.com" ||
      fEmail === "rubenlleg12@gmail.com" ||
      pEmail === "ben@brgytanod.com" ||
      fEmail === "ben@brgytanod.com" ||
      profile?.role === "superadmin" ||
      profile?.name?.toLowerCase().includes("ruben") ||
      firebaseUser?.uid === "rubenlleg12_admin_uid" // just in case
    );
  }, [profile, firebaseUser]);

  const currentRole: UserRole = profile?.role || "guest";

  const hasPermission = useCallback((permission: string): boolean => {
    if (isMasterAdmin) return true;

    const userPerms = RolePermissions[currentRole] || [];
    return userPerms.includes("*") || userPerms.includes(permission);
  }, [currentRole, isMasterAdmin]);

  const canAccessRole = useCallback((requiredRole: UserRole): boolean => {
    if (isMasterAdmin) return true;
    return (RoleHierarchy[currentRole] || 0) >= RoleHierarchy[requiredRole];
  }, [currentRole, isMasterAdmin]);

  const fetchProfile = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    
    // Attempt fetch with race for timeout
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 7000)
      );
      
      const userDoc = (await Promise.race([
        getDoc(userRef),
        timeoutPromise
      ])) as any;

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setProfile(userData);
        safeStorage.setItem("brgy_user_profile", JSON.stringify(userData));
        return;
      }
    } catch (e) {
      console.warn("[AuthContext] Primary fetch failed:", e);
    }

    // Fallback 1: Attempt cache directly
    try {
      console.log("[AuthContext] Trying cache fallback...");
      const cachedDoc = await getDocFromCache(userRef);
      if (cachedDoc.exists()) {
        const userData = cachedDoc.data() as User;
        setProfile(userData);
        safeStorage.setItem("brgy_user_profile", JSON.stringify(userData));
        return;
      }
    } catch (ce) {
      console.warn("[AuthContext] Cache fetch failed:", ce);
    }

    // Fallback 2: Local storage fallback
    const local = safeStorage.getItem("brgy_user_profile");
    if (local) {
      console.log("[AuthContext] Using local storage fallback");
      setProfile(JSON.parse(local));
      return;
    }

    // Default: Setup new profile
    console.log("[AuthContext] Setting up default profile");
    const userData: User = {
      id: uid,
      uid,
      name: firebaseUser?.displayName || "Barangay Resident",
      email: firebaseUser?.email || "",
      role: "resident",
      status: "approved",
      createdAt: new Date().toISOString(),
    };
    setProfile(userData);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Small delay to ensure Firestore is initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchProfile(fbUser.uid);
      } else {
        setProfile(null);
        safeStorage.removeItem("brgy_user_profile");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser?.uid) await fetchProfile(firebaseUser.uid);
  };

  const setUserRole = async (newRole: UserRole) => {
    if (!firebaseUser || !canAccessRole("admin")) {
      throw new Error("Insufficient permissions to change role");
    }

    await setDoc(
      doc(db, "users", firebaseUser.uid),
      { role: newRole, updatedAt: serverTimestamp() },
      { merge: true }
    );

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
