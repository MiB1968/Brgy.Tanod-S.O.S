import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
  init: (onAuthSuccess?: (user: User, token: string) => void, onAuthFailure?: () => void) => {
    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          // If we have a user but no token, we might need to re-auth or it's a silent refresh failure
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
      console.error('Workspace login error:', error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  },

  getAccessToken: () => cachedAccessToken,

  logout: async () => {
    await auth.signOut();
    cachedAccessToken = null;
  }
};

export const calendarService = {
  listEvents: async () => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  createEvent: async (event: any) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    return res.json();
  }
};

export const chatService = {
  listSpaces: async () => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  sendMessage: async (spaceName: string, text: string) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return res.json();
  }
};

export const taskService = {
  listTaskLists: async () => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  createTask: async (taskListId: string, task: any) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });
    return res.json();
  }
};

export const docsService = {
  createDocument: async (title: string) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    return res.json();
  }
};

export const slidesService = {
  createPresentation: async (title: string) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    return res.json();
  }
};

export const formsService = {
  createForm: async (title: string) => {
    const token = workspaceAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    const res = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ info: { title } })
    });
    return res.json();
  }
};
