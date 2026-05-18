import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';          // ← shared singleton, no more double-init
import * as safeStorage from '../lib/safeStorage';   // ← replaces all raw localStorage calls

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  refreshRole: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(
    safeStorage.getItem('brgy_user_role')   // ← was: localStorage.getItem(...)
  );
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const newRole = userDoc.data()?.role || 'resident';
        setRole(newRole);
        safeStorage.setItem('brgy_user_role', newRole);   // ← was: localStorage.setItem(...)
      } else {
        const defaultRole = 'resident';
        setRole(defaultRole);
        safeStorage.setItem('brgy_user_role', defaultRole);
        try {
          await setDoc(
            doc(db, 'users', uid),
            { role: defaultRole, createdAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (e) {
          console.warn('[AuthContext] Could not sync default role to Firestore (offline).');
        }
      }
    } catch (error: any) {
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        const cachedRole = safeStorage.getItem('brgy_user_role');  // ← was: localStorage.getItem(...)
        setRole(cachedRole || 'resident');
      } else {
        console.error('[AuthContext] Error fetching user role:', error);
        setRole('resident');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchRole(firebaseUser.uid);
      } else {
        setUser(null);
        setRole(null);
        safeStorage.removeItem('brgy_user_role');  // ← was: localStorage.removeItem(...)
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshRole = async () => {
    if (user) await fetchRole(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRBAC = () => useContext(AuthContext);
