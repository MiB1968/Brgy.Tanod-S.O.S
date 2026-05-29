import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import * as safeStorage from '../lib/safeStorage';
import socket from '../lib/socket';
import { pushService } from '../services/pushNotificationService';
import type { User, UserRole } from '../types';
import { RoleHierarchy, RolePermissions } from '../types';
import { useAuthStore } from '../store/useAuthStore';

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
  const setStoreProfile = useAuthStore((state) => state.setProfile);
  const setStoreLoading = useAuthStore((state) => state.setIsLoading);

  // Failsafe timeout for rbac loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setStoreLoading(false);
    }, 15000); // 15 seconds failsafe is safer for multi-step firestore init
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
        setStoreProfile(userData);
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
        setStoreProfile(userData);
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
      const saved = JSON.parse(local);
      setProfile(saved);
      setStoreProfile(saved);
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
    setStoreProfile(userData);
  };

  useEffect(() => {
    const handleAuthExpired = async () => {
      if (auth.currentUser) {
        try {
          console.warn("[AuthContext] Token expired event detected. Attempting force refresh...");
          const token = await auth.currentUser.getIdToken(true);
          safeStorage.setItem('token', token);
          socket.auth = { token };
          if (!socket.connected) socket.connect();
        } catch (e) {
          console.error("[AuthContext] Force refresh failed. Signing out.", e);
          auth.signOut();
        }
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Update socket token
        try {
          const token = await fbUser.getIdToken(); // Removed true (force refresh) to use cache
          safeStorage.setItem('token', token);
          
          // Force socket update if it's already attempting or disconnected
          socket.auth = { token };
          if (!socket.connected) {
            socket.connect();
          }
        } catch (tokenErr) {
          console.warn("[AuthContext] Failed to get ID token:", tokenErr);
        }

        // Small delay to ensure Firestore is initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchProfile(fbUser.uid);

        // Register FCM token
        pushService.initialize().then(async (token) => {
          if (token) {
            await setDoc(doc(db, 'users', fbUser.uid), {
              fcmToken: token,
              lastActive: serverTimestamp()
            }, { merge: true });
          }
        });
      } else {
        setProfile(null);
        setStoreProfile(null);
        safeStorage.removeItem("brgy_user_profile");
        safeStorage.removeItem("token");
        if (socket.connected) {
          socket.disconnect();
        }
      }

      setLoading(false);
      setStoreLoading(false);
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
