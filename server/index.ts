import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { join, relative } from 'path';
import { checkRateLimit } from './lib/rateLimit';
import { getRecommendations, detectProvider } from './lib/providers';
import { getUserPlan } from './lib/supabaseAdmin';
import { createCheckoutSession, createPortalSession, handleWebhookEvent, getStripe } from './lib/stripe';
import { setUserPlan, getStripeCustomerId } from './lib/supabaseAdmin';
import type { AIRecommendationRequest } from './lib/types';

const app = new Hono();

// DIST_PATH is absolute; DIST_REL is relative to CWD for serveStatic (hono/bun requires relative root)
const DIST_PATH = join(import.meta.dir, '../dist');
const DIST_REL = relative(process.cwd(), DIST_PATH);
 
const PORT = Number(process.env.PORT || 3001);
const COMMUNITY_MODE = process.env.COMMUNITY_MODE === 'true';
const FREE_MONTHLY_LIMIT = Number(process.env.AI_FREE_MONTHLY_LIMIT || process.env.FREE_MONTHLY_LIMIT || 30);
const PRO_DAILY_LIMIT = Number(process.env.AI_PRO_DAILY_LIMIT || process.env.PRO_DAILY_LIMIT || 50);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const STRIPE_ENABLED = !!(process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** App origin used to build redirect URLs server-side (avoids open-redirect). */
function appOrigin(): string {
  return ALLOWED_ORIGIN !== '*' ? ALLOWED_ORIGIN : 'http://localhost:8080';
}

app.use('*', logger());
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
  let planType: 'community' | 'pro' | 'free' = 'free';

  if (COMMUNITY_MODE) {
    limit = Infinity;
    planType = 'community';
  } else {
    // Check if we can verify the user's plan via Supabase
    const canCheckPlan = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = c.req.header('Authorization');

    if (canCheckPlan && authHeader?.startsWith('Bearer ')) {
      try {
        const { plan, userId } = await getUserPlan(authHeader.slice(7));
        planType = plan;
        limit = plan === 'pro' ? PRO_DAILY_LIMIT : FREE_MONTHLY_LIMIT;
        console.log(`[AI proxy] Verified ${planType} for user ${userId}. Limit: ${limit}`);
      } catch (e: any) {
        console.warn(`[AI proxy] User plan check failed: ${e.message}. Using free.`);
        limit = FREE_MONTHLY_LIMIT;
      }
    } else {
      if (!canCheckPlan && authHeader) {
        console.warn('[AI proxy] Auth token provided but Supabase keys are missing on server. Defaulting to free.');
      }
      limit = FREE_MONTHLY_LIMIT;
    }
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

/** Dynamically inject environment variables into the frontend.
 * AI_API_KEY is intentionally excluded — it stays server-side only. */
app.get('/config.js', (c) => {
  const envVars = {
    AI_PROXY_URL:          process.env.AI_PROXY_URL || '',
    AI_FREE_MONTHLY_LIMIT: process.env.AI_FREE_MONTHLY_LIMIT || process.env.FREE_MONTHLY_LIMIT || '30',
    AI_PRO_DAILY_LIMIT:    process.env.AI_PRO_DAILY_LIMIT || process.env.PRO_DAILY_LIMIT || '50',
    TMDB_API_KEY:          process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '',
    SUPABASE_URL:          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY:     process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    COMMUNITY_MODE:        String(COMMUNITY_MODE),
  };
  
  if (envVars.SUPABASE_URL) {
    console.log(`[config.js] serving Supabase config for ${envVars.SUPABASE_URL}`);
  } else {
    console.warn('[config.js] Supabase URL is missing in environment');
  }

  return c.text(`window.__ENV__ = ${JSON.stringify(envVars)};`, 200, {
    'Content-Type': 'application/javascript',
  });
});

// Redirect marketing pages in community mode
if (COMMUNITY_MODE) {
  ['/pricing', '/community', '/privacy', '/terms', '/contact'].forEach(path => {
    app.get(path, (c) => c.redirect('/app'));
    app.get(`${path}/`, (c) => c.redirect('/app'));
  });
}

// Serve static files — root must be relative to CWD for hono/bun's serveStatic
app.use('*', serveStatic({ root: DIST_REL }));
// SPA fallback: all unmatched routes serve index.html
app.get('*', serveStatic({ path: join(DIST_REL, 'index.html') }));

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
console.log(`   Community mode: ${COMMUNITY_MODE} (via process.env.COMMUNITY_MODE)`);
console.log(`   Stripe: ${STRIPE_ENABLED ? 'enabled' : 'disabled'}`);
console.log(`   Current directory: ${process.cwd()}`);
console.log(`   Internal DIST_PATH: ${DIST_PATH}`);

// Diagnostics: check if dist exists
const indexFile = Bun.file(join(DIST_PATH, 'index.html'));
const exists = await indexFile.exists();
console.log(`   Static assets status: ${exists ? '✅ index.html found' : '❌ index.html MISSING'}`);

if (!exists) {
  console.warn('   ⚠️  WARNING: Static assets not found in DIST_PATH. Server may only respond to API calls.');
}

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
