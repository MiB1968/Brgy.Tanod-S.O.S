// Compatibility layer for switching from Firebase to CockroachDB/SQL Backend
import { toast } from 'react-hot-toast';

// This is a minimal compatibility layer to prevent the app from crashing.
// Real Auth and DB operations should now go through our custom API.

export const onAuthStateChanged = (auth: any, callback: (user: any) => void) => {
    // Check localStorage for a token/user session
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        callback(user);
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
};

export const auth = {
  currentUser: null as any,
  onAuthStateChanged: (callback: (user: any) => void) => onAuthStateChanged(null, callback)
};

// Intercepting various Firestore & Auth functions to divert to our socket/api backend
export const collection = (db: any, path: string) => ({ id: path });
export const doc = (db: any, path: string, id: string) => ({ path, id });
export const getDoc = async (docRef: any) => {
    try {
        const res = await fetch(`/api/${docRef.path}/${docRef.id}`);
        const data = await res.json();
        return { exists: () => res.ok, data: () => data };
    } catch {
        return { exists: () => false };
    }
};
export const setDoc = async (docRef: any, data: any) => {
    return fetch(`/api/${docRef.path}/${docRef.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};
export const updateDoc = async (docRef: any, data: any) => {
    return fetch(`/api/${docRef.path}/${docRef.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};
export const onSnapshot = (query: any, callback: (snapshot: any) => void) => {
    // This is hard to polyfill perfectly without knowing the query
    // For now, we'll just skip it as we are using Sockets in App.tsx to catch updates
    return () => {}; 
};
export const query = (...args: any[]) => ({});
export const where = (...args: any[]) => ({});
export const orderBy = (...args: any[]) => ({});
export const limit = (...args: any[]) => ({});
export const getDocs = async (q: any) => ({ empty: true, docs: [] });
export const Timestamp = { now: () => new Date() };

export const db: any = {
  internal: "Proxy for SQL Backend"
};

export const getRedirectResult = async () => null;
export const signInWithRedirect = async () => {};
export const signInAnonymously = async () => ({ user: { uid: 'demo' } } as any);
export const GoogleAuthProvider = class {};
export const browserSessionPersistence = 'SESSION';
export const indexedDBLocalPersistence = 'INDEXEDDB';
export const setPersistence = async () => {};

export const storage: any = {};

// Helper for Login
export const loginWithGoogle = async () => {
    toast.error("Google Auth requires project-level configuration. Using Email/Password for now.");
};

export const signInWithEmail = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    window.location.reload();
};

export const registerWithEmail = async (email: string, pass: string, name: string, role: string, details?: any) => {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name, role, details })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    window.location.reload();
};

export const signOut = async () => {
    localStorage.clear();
    window.location.reload();
};
