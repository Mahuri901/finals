import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter compatible with Supabase's `auth.storage` option.
 *
 * On native platforms we use `expo-secure-store` (Keychain on iOS,
 * EncryptedSharedPreferences/Keystore on Android) so auth tokens are
 * encrypted at rest and persist across app restarts.
 *
 * On web there is no SecureStore, so we fall back to `localStorage`.
 */
export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const webStorage: StorageAdapter = {
  getItem: async (key) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

const secureStoreStorage: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const storage: StorageAdapter =
  Platform.OS === 'web' ? webStorage : secureStoreStorage;
