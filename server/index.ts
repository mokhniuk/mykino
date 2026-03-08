import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { checkRateLimit } from './lib/rateLimit';
import { getRecommendations, detectProvider } from './lib/providers';
import type { AIRecommendationRequest } from './lib/types';

const app = new Hono();

const PORT = Number(process.env.PORT || 3001);
const COMMUNITY_MODE = process.env.COMMUNITY_MODE === 'true';
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 3);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use('*', cors({ origin: ALLOWED_ORIGIN }));

/** Health check — also validates that a provider is configured. */
app.get('/health', (c) => {
  try {
    const provider = detectProvider();
    return c.json({ ok: true, provider, communityMode: COMMUNITY_MODE });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 503);
  }
});

/** AI recommendations proxy. */
app.post('/api/ai/recommendations', async (c) => {
  // Rate limiting — skip entirely in community mode (user owns the server)
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  const limit = COMMUNITY_MODE ? Infinity : FREE_DAILY_LIMIT;
  const { allowed, remaining, limit: effectiveLimit } = checkRateLimit(ip, limit);

  if (!allowed) {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return c.json(
      { error: 'Daily recommendation limit reached', resetAt: tomorrow.toISOString() },
      429,
    );
  }

  let body: AIRecommendationRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Basic validation
  if (!body.query || typeof body.query !== 'string') {
    return c.json({ error: 'Missing required field: query' }, 400);
  }

  try {
    const recommendations = await getRecommendations(body);
    return c.json(recommendations, 200, {
      'X-RateLimit-Limit': String(isFinite(effectiveLimit) ? effectiveLimit : 9999),
      'X-RateLimit-Remaining': String(isFinite(remaining) ? remaining : 9999),
    });
  } catch (e: any) {
    console.error('[AI proxy] Error:', e.message);
    // Don't expose internal error details to clients
    return c.json({ error: 'AI provider error. Please try again.' }, 502);
  }
});

console.log(`🎬 MyKino AI proxy starting on port ${PORT}`);
console.log(`   Community mode: ${COMMUNITY_MODE}`);
if (!COMMUNITY_MODE) console.log(`   Free daily limit: ${FREE_DAILY_LIMIT}`);

try {
  detectProvider();
} catch (e: any) {
  console.error(`⚠️  ${e.message}`);
  process.exit(1);
}

export default {
  port: PORT,
  fetch: app.fetch,
};
