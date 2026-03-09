import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { config } from '@/lib/config';

export interface UserProfile {
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  subscriptionStatus?: string;
  cancelAt?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const sb = getSupabase();
  const queryClient = useQueryClient();
  const queryKey = ['profile', user?.id];

  const { data: profile, isLoading, refetch } = useQuery<UserProfile | null>({
    queryKey,
    queryFn: async () => {
      if (!sb || !user) return null;
      const { data } = await sb
        .from('profiles')
        .select('plan, stripe_customer_id, subscription_status, subscription_cancel_at')
        .eq('id', user.id)
        .single();
      if (!data) return { plan: 'free' };
      return {
        plan: data.plan ?? 'free',
        stripeCustomerId: data.stripe_customer_id ?? undefined,
        subscriptionStatus: data.subscription_status ?? undefined,
        cancelAt: data.subscription_cancel_at ?? null,
      };
    },
    enabled: config.hasSync && !!sb && !!user,
    staleTime: 0,
  });

  // Realtime: invalidate query the instant the DB row changes
  useEffect(() => {
    if (!sb || !user) return;
    const channel = sb
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey }); },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [user?.id]);

  return {
    profile,
    isPro: profile?.plan === 'pro',
    cancelAt: profile?.cancelAt ?? null,
    loading: isLoading,
    refetch,
  };
}
