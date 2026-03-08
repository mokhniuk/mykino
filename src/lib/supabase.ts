import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config } from './config';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!config.hasSync) return null;
  if (!_client) {
    _client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, detectSessionInUrl: true },
    });
  }
  return _client;
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function signInWithEmail(email: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Sync not configured');
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/app/settings` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
