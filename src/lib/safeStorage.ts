
const memoryStorage = new Map<string, string>();

export const getItem = (key: string): string | null => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : memoryStorage.get(key) || null;
  } catch (e) {
    console.warn('Storage read restricted, using in-memory storage:', e);
    return memoryStorage.get(key) || null;
  }
};

export const setItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Storage write restricted, using in-memory storage:', e);
  }
  memoryStorage.set(key, value);
};

export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Storage delete restricted, using in-memory storage:', e);
  }
  memoryStorage.delete(key);
};

// Wipes both localStorage AND the in-memory fallback map
export const clear = (): void => {
  try {
    localStorage.clear();
  } catch (e) {
    console.warn('Storage clear restricted:', e);
  }
  memoryStorage.clear();
};
