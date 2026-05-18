import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });
}

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
  const [role, setRole] = useState<string | null>(localStorage.getItem('brgy_user_role'));
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const newRole = userDoc.data()?.role || 'resident';
        setRole(newRole);
        localStorage.setItem('brgy_user_role', newRole);
      } else {
        // Default role if not set
        const defaultRole = 'resident';
        setRole(defaultRole);
        localStorage.setItem('brgy_user_role', defaultRole);
        // Initialize user doc if needed (won't work offline, but that's okay)
        try {
          await setDoc(doc(db, "users", uid), {
            role: defaultRole,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn("Could not sync default role to server (offline)");
        }
      }
    } catch (error: any) {
      // Gracefully handle offline or permission errors
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        const cachedRole = localStorage.getItem('brgy_user_role');
        if (cachedRole) {
          setRole(cachedRole);
        } else {
          setRole('resident');
        }
      } else {
        console.error("Error fetching user role:", error);
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
        localStorage.removeItem('brgy_user_role');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshRole = async () => {
    if (user) {
      await fetchRole(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRBAC = () => useContext(AuthContext);
