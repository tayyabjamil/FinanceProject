import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─── Generic AsyncStorage helpers (non-sensitive app data) ───────────────────

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function setItem(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ─── Chunked SecureStore adapter (for Supabase auth tokens) ──────────────────
//
// iOS Keychain enforces a ~2048-byte limit per key. Supabase session JSON
// easily exceeds this, so we split the value into 1800-byte chunks and store
// each chunk under its own key, with a metadata key tracking the count.
//
//   <key>_numChunks   →  "3"
//   <key>_chunk_0     →  first 1800 bytes
//   <key>_chunk_1     →  next  1800 bytes
//   <key>_chunk_2     →  remainder
//
// This adapter implements the SupportedStorage interface expected by Supabase.

const CHUNK_SIZE = 1800;

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const numChunksStr = await SecureStore.getItemAsync(`${key}_numChunks`);
    if (numChunksStr === null) return null;

    const numChunks = parseInt(numChunksStr, 10);
    const chunks: string[] = [];
    for (let i = 0; i < numChunks; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}_numChunks`, String(chunks.length));
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk)),
    );
  },

  async removeItem(key: string): Promise<void> {
    const numChunksStr = await SecureStore.getItemAsync(`${key}_numChunks`);
    if (numChunksStr === null) return;
    const numChunks = parseInt(numChunksStr, 10);
    await SecureStore.deleteItemAsync(`${key}_numChunks`);
    await Promise.all(
      Array.from({ length: numChunks }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}_chunk_${i}`),
      ),
    );
  },
};

// ─── One-time migration: AsyncStorage → SecureStore ──────────────────────────
//
// Users who were already logged in had their session stored in plain AsyncStorage.
// This runs once on app startup: reads the old session, writes it to SecureStore,
// clears it from AsyncStorage, then sets a flag so it never runs again.

const MIGRATION_FLAG = 'auth_migrated_to_secure_store';

export async function migrateSessionToSecureStore(storageKey: string): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (alreadyMigrated) return;

  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) {
    await SecureStoreAdapter.setItem(storageKey, existing);
    await AsyncStorage.removeItem(storageKey);
  }

  await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
}
