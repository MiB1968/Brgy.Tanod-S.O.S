import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';   // ← shared singleton, removes double initializeApp

const provider = new GoogleAuthProvider();
// Workspace scopes
provider.addScope('https://www.googleapis.com/auth/chat.messages');
provider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/docs');
provider.addScope('https://www.googleapis.com/auth/slides');
provider.addScope('https://www.googleapis.com/auth/forms');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const workspaceAuth = {
  init: (
    onAuthSuccess?: (user: User, token: string) => void,
    onAuthFailure?: () => void
  ) => {
    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  },

  signIn: async (): Promise<{ user: User; accessToken: string } | null> => {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      console.error('[WorkspaceAuth] Sign-in error:', error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  },

  getAccessToken: () => cachedAccessToken,

  logout: async () => {
    await auth.signOut();
    cachedAccessToken = null;
  },
};

// ── Helper to get the token or throw a clear error ───────────────────────────
function requireToken(): string {
  const token = workspaceAuth.getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');
  return token;
}

// ── Calendar ─────────────────────────────────────────────────────────────────
export const calendarService = {
  listEvents: async () => {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      { headers: { Authorization: `Bearer ${requireToken()}` } }
    );
    return res.json();
  },
  createEvent: async (event: any) => {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requireToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );
    return res.json();
  },
};

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chatService = {
  listSpaces: async () => {
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: `Bearer ${requireToken()}` },
    });
    return res.json();
  },
  sendMessage: async (spaceName: string, text: string) => {
    const res = await fetch(
      `https://chat.googleapis.com/v1/${spaceName}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requireToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );
    return res.json();
  },
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const taskService = {
  listTaskLists: async () => {
    const res = await fetch(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
      { headers: { Authorization: `Bearer ${requireToken()}` } }
    );
    return res.json();
  },
  createTask: async (taskListId: string, task: any) => {
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requireToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      }
    );
    return res.json();
  },
};

// ── Docs ──────────────────────────────────────────────────────────────────────
export const docsService = {
  createDocument: async (title: string) => {
    const res = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    return res.json();
  },
};

// ── Slides ────────────────────────────────────────────────────────────────────
export const slidesService = {
  createPresentation: async (title: string) => {
    const res = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    return res.json();
  },
};

// ── Forms ─────────────────────────────────────────────────────────────────────
export const formsService = {
  createForm: async (title: string) => {
    const res = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ info: { title } }),
    });
    return res.json();
  },
};
