import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { checkRateLimit } from './lib/rateLimit';
import { getRecommendations, detectProvider } from './lib/providers';
import { getUserPlan } from './lib/supabaseAdmin';
import { createCheckoutSession, createPortalSession, handleWebhookEvent, getStripe } from './lib/stripe';
import { setUserPlan, getStripeCustomerId } from './lib/supabaseAdmin';
import type { AIRecommendationRequest } from './lib/types';

const app = new Hono();

const PORT = Number(process.env.PORT || 3001);
const COMMUNITY_MODE = process.env.COMMUNITY_MODE === 'true';
const FREE_MONTHLY_LIMIT = Number(process.env.FREE_MONTHLY_LIMIT || 30);
const PRO_DAILY_LIMIT = Number(process.env.PRO_DAILY_LIMIT || 50);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const STRIPE_ENABLED = !!(process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** App origin used to build redirect URLs server-side (avoids open-redirect). */
function appOrigin(): string {
  return ALLOWED_ORIGIN !== '*' ? ALLOWED_ORIGIN : 'http://localhost:8080';
}

app.use('*', cors({ origin: ALLOWED_ORIGIN }));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  try {
    const provider = detectProvider();
    return c.json({ ok: true, provider, communityMode: COMMUNITY_MODE, stripe: STRIPE_ENABLED });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 503);
  }
});

// ─── AI recommendations ───────────────────────────────────────────────────────

app.post('/api/ai/recommendations', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  // Determine limit: community → unlimited, pro user → unlimited, free user → capped
  let limit: number;
  if (COMMUNITY_MODE) {
    limit = Infinity;
  } else if (STRIPE_ENABLED) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { plan } = await getUserPlan(authHeader.slice(7));
        limit = plan === 'pro' ? PRO_DAILY_LIMIT : FREE_MONTHLY_LIMIT;
      } catch {
        limit = FREE_MONTHLY_LIMIT;
      }
    } else {
      limit = FREE_MONTHLY_LIMIT;
    }
  } else {
    limit = FREE_MONTHLY_LIMIT;
  }

  // Pro users: daily reset. Free users: monthly reset.
  const isPro = limit === PRO_DAILY_LIMIT;
  const period = isPro ? 'daily' : 'monthly';
  const { allowed, remaining, limit: effectiveLimit } = checkRateLimit(ip, limit, period);

  if (!allowed) {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return c.json({ error: 'Daily recommendation limit reached', resetAt: tomorrow.toISOString() }, 429);
  }

  let body: AIRecommendationRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.query || typeof body.query !== 'string') {
    return c.json({ error: 'Missing required field: query' }, 400);
  }

  try {
    const recommendations = await getRecommendations(body);
    return c.json(recommendations, 200, {
      'X-RateLimit-Limit': String(isFinite(effectiveLimit) ? effectiveLimit : 9999),
      'X-RateLimit-Remaining': String(isFinite(remaining) ? remaining : 9999),
      'X-RateLimit-Period': period,
    });
  } catch (e: any) {
    console.error('[AI proxy] Error:', e.message);
    return c.json({ error: 'AI provider error. Please try again.' }, 502);
  }
});

// ─── Stripe (only if configured) ─────────────────────────────────────────────

/** Stripe webhook — must read raw body before parsing. */
app.post('/api/stripe/webhook', async (c) => {
  console.log('[Stripe webhook] request received, STRIPE_ENABLED:', STRIPE_ENABLED);
  if (!STRIPE_ENABLED) return c.json({ error: 'Stripe not configured' }, 503);
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing stripe-signature header' }, 400);

  const rawBody = await c.req.text();

  try {
    await handleWebhookEvent(rawBody, sig);
    return c.json({ received: true });
  } catch (e: any) {
    console.error('[Stripe webhook]', e.message);
    return c.json({ error: e.message }, 400);
  }
});

/** Create a Stripe Checkout session (requires auth). */
app.post('/api/stripe/checkout', async (c) => {
  if (!STRIPE_ENABLED) return c.json({ error: 'Stripe not configured' }, 503);

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

  let userId: string, email: string;
  try {
    const info = await getUserPlan(authHeader.slice(7));
    userId = info.userId;
    email = info.email;
    if (!userId) return c.json({ error: 'Invalid token' }, 401);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  let body: { annual?: boolean };
  try { body = await c.req.json(); } catch { body = {}; }

  // Resolve price server-side — never trust price IDs from the client
  const priceId = body.annual
    ? process.env.STRIPE_PRICE_ANNUAL
    : process.env.STRIPE_PRICE_MONTHLY;
  if (!priceId) return c.json({ error: 'Stripe prices not configured on server' }, 503);

  // Build redirect URLs server-side to prevent open-redirect attacks
  const origin = appOrigin();
  const successUrl = `${origin}/app/settings?checkout=success`;
  const cancelUrl  = `${origin}/app/settings?checkout=cancelled`;

  try {
    const url = await createCheckoutSession({ userId, email, priceId, successUrl, cancelUrl });
    return c.json({ url });
  } catch (e: any) {
    console.error('[Stripe checkout]', e.message);
    return c.json({ error: 'Failed to create checkout session' }, 502);
  }
});

/**
 * Sync plan from Stripe after billing portal return.
 * Reads the live subscription state from Stripe and updates Supabase.
 * Called client-side when user returns from the portal — recommended by Stripe docs.
 */
app.post('/api/stripe/refresh-plan', async (c) => {
  if (!STRIPE_ENABLED) return c.json({ error: 'Stripe not configured' }, 503);

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

  let userId: string, email: string;
  try {
    const info = await getUserPlan(authHeader.slice(7));
    userId = info.userId;
    email = info.email;
    if (!userId) return c.json({ error: 'Invalid token' }, 401);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const stripe = getStripe();

  // Find Stripe customer
  let customerId = await getStripeCustomerId(userId);
  if (!customerId && email) {
    const found = await stripe.customers.list({ email, limit: 1 });
    if (found.data.length) customerId = found.data[0].id;
  }
  if (!customerId) return c.json({ plan: 'free' });

  // Get current active or trialing subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'all',
  });

  const sub = subscriptions.data.find(s =>
    s.status === 'active' || s.status === 'trialing',
  );

  if (!sub) {
    // No active subscription — ensure plan is free
    await setUserPlan(userId, 'free', { customerId });
    console.log(`[refresh-plan] plan=free for user ${userId}`);
    return c.json({ plan: 'free' });
  }

  const cancelAt = sub.cancel_at_period_end && sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await setUserPlan(userId, 'pro', {
    customerId,
    subscriptionId: sub.id,
    subscriptionStatus: sub.status,
    cancelAt,
  });

  console.log(`[refresh-plan] plan=pro cancelAt=${cancelAt ?? 'none'} for user ${userId}`);
  return c.json({ plan: 'pro', cancelAt });
});

/** Create a Stripe Customer Portal session (for managing billing). */
app.post('/api/stripe/portal', async (c) => {
  if (!STRIPE_ENABLED) return c.json({ error: 'Stripe not configured' }, 503);

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

  let userId: string, email: string;
  try {
    const info = await getUserPlan(authHeader.slice(7));
    userId = info.userId;
    email = info.email;
    if (!userId) return c.json({ error: 'Invalid token' }, 401);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Build return URL server-side to prevent open-redirect attacks
  const returnUrl = `${appOrigin()}/app/settings?portal=returned`;

  try {
    const url = await createPortalSession({ userId, email, returnUrl });
    return c.json({ url });
  } catch (e: any) {
    console.error('[Stripe portal]', e.message);
    return c.json({ error: e.message }, 502);
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

console.log(`🎬 MyKino AI proxy starting on port ${PORT}`);
console.log(`   Community mode: ${COMMUNITY_MODE}`);
console.log(`   Stripe: ${STRIPE_ENABLED ? 'enabled' : 'disabled'}`);
if (!COMMUNITY_MODE) console.log(`   Free monthly limit: ${FREE_MONTHLY_LIMIT} | Pro daily limit: ${PRO_DAILY_LIMIT}`);

try {
  detectProvider();
} catch (e: any) {
  console.error(`⚠️  ${e.message}`);
  process.exit(1);
}

if (STRIPE_ENABLED && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('⚠️  STRIPE_WEBHOOK_SECRET is required when Stripe is enabled');
  process.exit(1);
}

if (STRIPE_ENABLED && !process.env.STRIPE_PRICE_MONTHLY && !process.env.STRIPE_PRICE_ANNUAL) {
  console.warn('⚠️  Neither STRIPE_PRICE_MONTHLY nor STRIPE_PRICE_ANNUAL is set — checkout will fail');
}

if (STRIPE_ENABLED && ALLOWED_ORIGIN === '*') {
  console.warn('⚠️  ALLOWED_ORIGIN is not set — Stripe success/cancel URLs will point to localhost:8080');
}

export default { port: PORT, fetch: app.fetch };
