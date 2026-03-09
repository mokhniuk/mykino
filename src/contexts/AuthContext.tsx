import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { fullSync, setupSyncListener, setCachedPlan } from '@/lib/sync';
import { config } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  /** True during the initial session check on mount. */
  loading: boolean;
  /** True while a full sync is in progress. */
  syncing: boolean;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  syncing: false,
  triggerSync: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    if (!config.hasSync) return;

    const sb = getSupabase()!;

    // Set up the mutation sync listener once
    setupSyncListener();

    /** Fetch the user's plan from Supabase and update the sync cache. */
    async function fetchAndCachePlan(userId: string): Promise<'free' | 'pro'> {
      const { data } = await sb.from('profiles').select('plan').eq('id', userId).single();
      const plan: 'free' | 'pro' = data?.plan === 'pro' ? 'pro' : 'free';
      setCachedPlan(plan);
      return plan;
    }

    // Initial session check
    sb.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      setUser(user);
      setLoading(false);
      if (user) {
        const plan = await fetchAndCachePlan(user.id);
        if (plan === 'pro') triggerSync();
      }
    });

    // Listen for auth state changes (magic link callback, sign-out, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      if (newUser) {
        const plan = await fetchAndCachePlan(newUser.id);
        setUser(prev => {
          if (!prev && plan === 'pro') triggerSync();
          return newUser;
        });
      } else {
        setCachedPlan(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [triggerSync]);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, triggerSync }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
