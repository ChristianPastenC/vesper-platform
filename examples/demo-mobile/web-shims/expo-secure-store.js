export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
export const ALWAYS = 'ALWAYS';
export const ALWAYS_THIS_DEVICE_ONLY = 'ALWAYS_THIS_DEVICE_ONLY';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY';
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';

const memoryStore = new Map();

const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
};

export const setItemAsync = async (key, value) => {
  const storage = getStorage();
  if (storage) {
    storage.setItem(`sovereign_sec_${key}`, value);
  } else {
    memoryStore.set(key, value);
  }
};

export const getItemAsync = async (key) => {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(`sovereign_sec_${key}`);
  }
  return memoryStore.get(key) ?? null;
};

export const deleteItemAsync = async (key) => {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(`sovereign_sec_${key}`);
  } else {
    memoryStore.delete(key);
  }
};
