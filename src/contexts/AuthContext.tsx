import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { fullSync, setupSyncListener, setCachedPlan } from '@/lib/sync';
import { config } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  /** True during the initial session check on mount. */
  loading: boolean;
  /** True while a full sync is in progress. */
  syncing: boolean;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  loading: false,
  syncing: false,
  triggerSync: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(config.hasSync);
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fullSync();
    } catch (e) {
      console.warn('[sync] full sync failed', e);
    } finally {
      setSyncing(false);
    }
  }, []);

  const fetchAndCachePlan = useCallback(async (userId: string): Promise<'free' | 'pro'> => {
    const sb = getSupabase();
    if (!sb) return 'free';
    const { data } = await sb.from('profiles').select('plan').eq('id', userId).single();
    const plan: 'free' | 'pro' = data?.plan === 'pro' ? 'pro' : 'free';
    setCachedPlan(plan);
    return plan;
  }, []);

  useEffect(() => {
    if (!config.hasSync) return;

    const sb = getSupabase()!;
    setupSyncListener();

    // Supabase v2 recommended pattern: rely solely on onAuthStateChange.
    // INITIAL_SESSION fires on mount with the stored session (or null) —
    // this is the single source of truth for the initial auth state, avoiding
    // the race between getSession() resolving and INITIAL_SESSION firing.
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      console.log('[auth]', event, newUser?.email ?? null);

      // Supabase v2 holds the auth lock while calling this callback (and awaits it).
      // Any Supabase DB call (sb.from(...)) internally calls getSession() which also
      // tries to acquire the same lock → deadlock. Defer ALL state updates with
      // setTimeout(0) so they run after the auth lock is released.
      setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          setCachedPlan(null);
          setUser(null);
          setAccessToken(null);
          return;
        }

        if (newUser) {
          setUser(newUser);
          setAccessToken(session?.access_token ?? null);
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            setLoading(false);
          }
          fetchAndCachePlan(newUser.id).then(plan => {
            if (plan === 'pro') triggerSync();
          }).catch(e => console.warn('[auth] fetchAndCachePlan failed:', e));
        } else if (event === 'INITIAL_SESSION') {
          // INITIAL_SESSION with no session = not logged in
          setUser(null);
          setLoading(false);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [triggerSync, fetchAndCachePlan]);

  // Refresh plan every 5 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchAndCachePlan(user.id);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, fetchAndCachePlan]);

  // Refresh plan when tab regains focus
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (!document.hidden) fetchAndCachePlan(user.id);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, fetchAndCachePlan]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, syncing, triggerSync }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
