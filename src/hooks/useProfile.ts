import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { config } from '@/lib/config';

export interface UserProfile {
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

export function useProfile() {
  const { user } = useAuth();
  const sb = getSupabase();

  const { data: profile, isLoading, refetch } = useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!sb || !user) return null;
      const { data } = await sb
        .from('profiles')
        .select('plan, stripe_customer_id, subscription_status')
        .eq('id', user.id)
        .single();
      if (!data) return { plan: 'free' };
      return {
        plan: data.plan ?? 'free',
        stripeCustomerId: data.stripe_customer_id ?? undefined,
        subscriptionStatus: data.subscription_status ?? undefined,
      };
    },
    enabled: config.hasSync && !!sb && !!user,
    staleTime: 2 * 60 * 1000,
  });

  return {
    profile,
    isPro: profile?.plan === 'pro',
    loading: isLoading,
    refetch,
  };
}
