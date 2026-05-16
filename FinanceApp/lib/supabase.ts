import { createClient } from '@supabase/supabase-js';
import { SecureStoreAdapter, migrateSessionToSecureStore } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Derive the storage key Supabase uses internally: sb-<projectRef>-auth-token
// Used for the one-time AsyncStorage → SecureStore migration.
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'project';
export const SUPABASE_STORAGE_KEY = `sb-${projectRef}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,   // iOS Keychain / Android Keystore
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Call this once at app startup (e.g. root layout) before any auth checks.
// Silently migrates any existing AsyncStorage session to SecureStore so
// already-logged-in users are not forced to log in again.
export async function initSupabase(): Promise<void> {
  await migrateSessionToSecureStore(SUPABASE_STORAGE_KEY);
}
