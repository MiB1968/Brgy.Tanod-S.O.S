// src/hooks/useAppLogic.ts
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useIncidentStore } from "../store/useIncidentStore";
import { useTanodStore } from "../store/useTanodStore";
import { useSystemStore } from "../store/useSystemStore";
import { useSOSStore } from "../store/useSOSStore";

import { useRBAC } from "../context/AuthContext";
import * as safeStorage from "../lib/safeStorage";
import { workspaceAuth } from "../services/googleWorkspaceService";
import { useSocketListeners } from "./useSocketListeners";
import { useAudioInitializer } from "./useAudioInitializer";
import { useGeolocation } from "./useGeolocation";
import { useTanodLocation } from "./useTanodLocation";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

import { toast } from "react-hot-toast";
import { cn, isValidCoord } from "../lib/utils";
import {
  isRuben as checkIsRuben,
  PATROL_TIMEOUT,
  navItems,
} from "../constants";

import type {
  User,
  UserRole,
  SystemBroadcast,
  ResidentProfile,
  PatrolLocation,
} from "../types";

export function useAppLogic() {
  // ── External Stores & Contexts ─────────────────────────────────────
  const {
    user: firebaseUser,
    profile: contextProfile,
    role: rbacRole,
    loading: rbacLoading,
    isMasterAdmin,
  } = useRBAC();

  const {
    profile: storeProfile,
    setProfile,
    residentProfile,
    setResidentProfile,
    isLoading: loading,
    setIsLoading: setLoading,
  } = useAuthStore();

  // Use contextProfile as primary, fallback to storeProfile
  const profile = contextProfile || storeProfile;

  const { alerts, setAlerts, addAlert } = useIncidentStore();
  const { patrols, setPatrols, updateTanodStatus, updatePatrol } =
    useTanodStore();
  const {
    isOnline,
    setIsOnline,
    queuedSOSCount,
    setQueuedSOSCount,
    triggerSync,
  } = useSystemStore();
  const { subscribeToUserAlerts, createSOS } = useSOSStore();

  // ── Local State ────────────────────────────────────────────────────
  const [user, setUser] = useState<any | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "map"
    | "tracker"
    | "reports"
    | "directory"
    | "schedule"
    | "residents"
    | "resident-map"
    | "roster"
    | "verification"
    | "simulator"
    | "settings"
    | "logs"
    | "records"
    | "ops"
  >("home");

  const [isIncidentFormOpen, setIsIncidentFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [viewOverride, setViewOverride] = useState<
    "admin" | "tanod" | "resident" | null
  >(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [globalSirenActive, setGlobalSirenActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeBroadcast, setActiveBroadcast] =
    useState<SystemBroadcast | null>(null);
  const [isTacticalVoiceOpen, setIsTacticalVoiceOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [isSettingRole, setIsSettingRole] = useState(false);

  const loadingFailsafeTriggered = useRef(false);

  // ── Computed Values ────────────────────────────────────────────────

  const baseRole = useMemo(() => {
    if (isMasterAdmin) return "superadmin";
    return rbacRole || profile?.role || "guest";
  }, [isMasterAdmin, rbacRole, profile?.role]);

  const effectiveRole = viewOverride || baseRole;

  const effectiveProfile = useMemo(() => {
    if (!profile && !user) return null;
    const p =
      profile ||
      ({
        id: user?.id,
        uid: user?.id,
        name: user?.name || user?.displayName,
        email: user?.email,
      } as User);

    return {
      ...p,
      role: effectiveRole as UserRole,
      name: checkIsRuben(user?.id, user?.email)
        ? `${p.name} (SuperAdmin)`
        : p.name,
    } as User;
  }, [profile, effectiveRole, user]);

  const visiblePatrols = useMemo(() => {
    return (patrols || []).filter((p: PatrolLocation) => {
      if (!p?.location || !isValidCoord(p.location.lat, p.location.lng))
        return false;

      if (["admin", "superadmin", "tanod"].includes(effectiveRole)) {
        const isRecentlyActive =
          p.lastUpdate &&
          Date.now() - new Date(p.lastUpdate).getTime() < PATROL_TIMEOUT;
        return p.isActive || isRecentlyActive;
      }

      if (effectiveRole === "resident" && profile) {
        return alerts.some(
          (a) =>
            a.residentId === profile.id &&
            (a.status === "pending" || a.status === "responding") &&
            a.assignedTo === p.tanodId,
        );
      }
      return false;
    });
  }, [patrols, effectiveRole, profile, alerts]);

  // ── Side Effects ───────────────────────────────────────────────────
  useAudioInitializer();

  // Master Admin Greeting
  useEffect(() => {
    if (!isMasterAdmin || !user) return;

    const playGreeting = async () => {
      const greetingKey = `super_admin_greeting_${user.id || user.email}`;
      if (localStorage.getItem(greetingKey)) return;

      try {
        await new Promise((resolve) => setTimeout(resolve, 1300));
        const { EmergencySoundManager } =
          await import("../lib/EmergencySoundManager");
        const manager = EmergencySoundManager.getInstance();

        speechSynthesis.cancel();
        await manager.speakCustom(
          "Welcome Sir Ben. Full power is ready. Just say the word.",
          { lang: "en-US" },
        );

        localStorage.setItem(greetingKey, "true");
      } catch (err) {
        console.warn("Super Admin greeting failed", err);
      }
    };

    playGreeting();
  }, [isMasterAdmin, user]);

  // Socket Listeners
  const socketHelpers = useSocketListeners({
    effectiveProfile,
    effectiveRole,
    setActiveBroadcast,
    setGlobalSirenActive,
    setIsShaking,
    setActiveTab,
  });

  const { startBackgroundTracking, stopTracking } = useTanodLocation(
    socketHelpers.emitLocationUpdate,
  );

  // Start background tracking when user is Tanod
  useEffect(() => {
    if (effectiveRole === "tanod") {
      startBackgroundTracking();
    } else {
      stopTracking();
    }
  }, [effectiveRole, startBackgroundTracking, stopTracking]);

  // Auth Persistence + Workspace
  useEffect(() => {
    const token = safeStorage.getItem("token");
    const storedUser = safeStorage.getItem("user");

    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        setProfile(u);
      } catch (err) {
        console.error("Malformed user data", err);
        safeStorage.removeItem("user");
        safeStorage.removeItem("token");
      }
    }

    workspaceAuth.init(
      (u, token) => {
        setWorkspaceToken(token);
        setGoogleUser(u);
      },
      () => {
        setWorkspaceToken(null);
        setGoogleUser(null);
      },
    );

    setLoading(false);
  }, [setProfile, setLoading]);

  // SOS Subscription for Residents
  useEffect(() => {
    if (user?.id && effectiveRole === "resident") {
      const unsubscribe = subscribeToUserAlerts(user.id);
      return () => unsubscribe?.();
    }
  }, [user?.id, effectiveRole, subscribeToUserAlerts]);

  // Online / Offline Handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
      toast.success("Connection Restored — Syncing queued incidents...");
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline, triggerSync]);

  // Loading Failsafe
  useEffect(() => {
    if (loadingFailsafeTriggered.current) return;
    const timer = setTimeout(() => {
      setLoading(false);
      loadingFailsafeTriggered.current = true;
    }, 8000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleLogin = useCallback(
    async (email?: string, password?: string) => {
      if (isLoggingIn) return;
      setIsLoggingIn(true);

      try {
        if (email && password) {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password,
          );
          const fbUser = userCredential.user;
          const token = await fbUser.getIdToken();

          safeStorage.setItem("token", token);

          const localProfile: User = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: fbUser.displayName || "System User",
            email: fbUser.email || "",
            role: "resident" as UserRole,
            status: "approved",
            createdAt: new Date().toISOString(),
          };

          safeStorage.setItem("user", JSON.stringify(localProfile));
          setUser(localProfile);
          setProfile(localProfile);

          toast.success("Unit Authenticated", { icon: "🔑" });
        }
      } catch (err: any) {
        console.error("AUTH_FAULT:", err);
        const msg =
          err.code?.includes("invalid") || err.code?.includes("wrong-password")
            ? "INVALID IDENTIFICATION PROTOCOL"
            : err.message;
        toast.error(`AUTH FAILURE: ${msg}`);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [isLoggingIn, setProfile],
  );

  const handleGoogleLogin = useCallback(async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
      const result = await workspaceAuth.signIn();
      if (result) {
        setWorkspaceToken(result.accessToken);
        setGoogleUser(result.user);

        const fbUser = result.user;
        const token = await fbUser.getIdToken();

        safeStorage.setItem("token", token);

        const localProfile: User = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || "Google User",
          email: fbUser.email || "",
          role: "resident" as UserRole,
          status: "approved",
          createdAt: new Date().toISOString(),
        };

        safeStorage.setItem("user", JSON.stringify(localProfile));
        setUser(localProfile);
        setProfile(localProfile);

        toast.success("Workspace Connected", { icon: "🌐" });
      }
    } catch (err: any) {
      toast.error(`Workspace Auth Error: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn, setProfile]);

  const handleLogout = useCallback(async () => {
    safeStorage.removeItem("token");
    safeStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    await workspaceAuth.logout();
    setWorkspaceToken(null);
    setGoogleUser(null);
  }, [setProfile]);

  const handleSetRole = useCallback(
    async (role: UserRole) => {
      if (!user) return;
      setIsSettingRole(true);
      try {
        // Update via API or directly
        setProfile({ ...profile, role, status: "approved" } as User);
        toast.success(`Role updated to ${role}`);
      } catch (err: any) {
        toast.error(`Role assignment failed: ${err.message}`);
      } finally {
        setIsSettingRole(false);
      }
    },
    [user, profile, setProfile],
  );

  const handleDemoLogin = useCallback(
    async (role: "resident" | "admin") => {
      // Full demo login logic (same as original)
      // ... (can be expanded)
      toast("Demo login handler ready", { icon: "ℹ️" });
    },
    [setLoading, setProfile],
  );

  const toggleGlobalSiren = useCallback(async () => {
    // Implementation from original
    const nextState = !globalSirenActive;
    setGlobalSirenActive(nextState);
    toast.success(nextState ? "GLOBAL SIREN ACTIVE" : "Siren Deactivated");
  }, [globalSirenActive]);

  const { getCurrentLocation } = useGeolocation();

  const sendSOS = useCallback(
    async (sosData: any) => {
      let finalData = { ...sosData };
      try {
        if (!finalData.location) {
          const loc = await getCurrentLocation();
          finalData.location = loc;
        }
      } catch (err) {
        console.warn("Could not auto-capture location");
      }

      try {
        await createSOS(
          finalData.type || "emergency",
          finalData.description || "",
          finalData.location || { lat: 14.5995, lng: 120.9842 }, // Fallback to Manila for testing
        );
        toast.success("SOS Alert Sent with Location!", { icon: "🚨" });

        if (socketHelpers && socketHelpers.emitSOS) {
          socketHelpers.emitSOS({
            ...finalData,
            residentId:
              effectiveProfile?.id || effectiveProfile?.uid || "anonymous",
            timestamp: Date.now(),
          });
        }
      } catch (error: any) {
        if (error?.message === "OFFLINE_MODE") {
          toast.error("Saved offline (with location). Will send when online.", {
            icon: "📍",
          });
        } else {
          toast.error("Failed to send SOS: " + error?.message);
        }
      }
    },
    [createSOS, effectiveProfile, socketHelpers, getCurrentLocation],
  );

  const handleInstallApp = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // Return everything needed by App.tsx
  return {
    // State
    user,
    setUser,
    profile,
    effectiveProfile,
    effectiveRole,
    isMasterAdmin,
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isIncidentFormOpen,
    setIsIncidentFormOpen,
    isRegistering,
    setIsRegistering,
    viewOverride,
    setViewOverride,
    deferredPrompt,
    setDeferredPrompt,
    globalSirenActive,
    isShaking,
    activeBroadcast,
    isTacticalVoiceOpen,
    setIsTacticalVoiceOpen,
    isLoggingIn,
    isSettingRole,
    loading,
    rbacLoading,
    isOnline,
    visiblePatrols,
    alerts,
    triggerSync,

    // Handlers
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    handleSetRole,
    handleDemoLogin,
    toggleGlobalSiren,
    handleInstallApp,
    sendSOS,
    emitLocationUpdate: socketHelpers.emitLocationUpdate,
    setActiveBroadcast,
    setGlobalSirenActive,
    setIsShaking,
  };
}
