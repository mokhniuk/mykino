import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!_admin) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for plan verification');
    }
    _admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _admin;
}

/** Verifies a user's access token and returns their plan ('free' | 'pro'). */
export async function getUserPlan(accessToken: string): Promise<{ userId: string; email: string; plan: 'free' | 'pro' }> {
  const admin = getAdmin();

  const { data: { user }, error } = await admin.auth.getUser(accessToken);
  if (error || !user) return { userId: '', email: '', plan: 'free' };

  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? '',
    plan: profile?.plan === 'pro' ? 'pro' : 'free',
  };
}

/** Upserts plan + Stripe metadata into the profiles table. */
export async function setUserPlan(
  userId: string,
  plan: 'free' | 'pro',
  stripe?: { customerId?: string; subscriptionId?: string; subscriptionStatus?: string },
) {
  const admin = getAdmin();
  await admin.from('profiles').upsert({
    id: userId,
    plan,
    ...(stripe?.customerId       && { stripe_customer_id:       stripe.customerId }),
    ...(stripe?.subscriptionId   && { stripe_subscription_id:   stripe.subscriptionId }),
    ...(stripe?.subscriptionStatus && { subscription_status:    stripe.subscriptionStatus }),
  });
}

/** Looks up a user by their Stripe customer ID. */
export async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const admin = getAdmin();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

/** Gets the stored Stripe customer ID for a user, if any. */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const admin = getAdmin();
  const { data } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();
  return data?.stripe_customer_id ?? null;
}
