
const memoryStorage = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : memoryStorage.get(key) || null;
    } catch (e) {
      console.warn('Storage read restricted, using in-memory storage:', e);
      return memoryStorage.get(key) || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage write restricted, using in-memory storage:', e);
    }
    // Always store in memory as well to ensure consistency if localStorage randomly fails
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage delete restricted, using in-memory storage:', e);
    }
    memoryStorage.delete(key);
  }
};
