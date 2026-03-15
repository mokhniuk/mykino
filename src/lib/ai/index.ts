import { getSetting, setSetting } from '../db';
import { config } from '../config';
import { getSupabase } from '../supabase';
import type { AIConfig, AIProvider, AIRecommendationRequest, AIRecommendation } from './types';
import { OpenAIClient } from './clients/openai';
import { AnthropicClient } from './clients/anthropic';
import { GeminiClient } from './clients/gemini';
import { MistralClient } from './clients/mistral';
import { OllamaClient } from './clients/ollama';

// ─── Typed error for limit exhaustion ────────────────────────────────────────

export class AILimitReachedError extends Error {
  constructor() { super('AI recommendation limit reached'); this.name = 'AILimitReachedError'; }
}

// ─── AI usage tracking (for managed proxy mode) ─────────────────────────────

const AI_USAGE_KEY = 'ai_proxy_usage';

interface AIUsageStore {
  remaining: number;
  limit: number;
  periodKey: string; // YYYY-MM-DD for daily, YYYY-MM for monthly
  period: 'daily' | 'monthly';
}

function storeAIUsage(remaining: number, limit: number, period: 'daily' | 'monthly') {
  try {
    const now = new Date();
    const periodKey = period === 'daily'
      ? now.toISOString().slice(0, 10)  // YYYY-MM-DD
      : now.toISOString().slice(0, 7);  // YYYY-MM
    const entry: AIUsageStore = { remaining, limit, periodKey, period };
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify(entry));
    window.dispatchEvent(new CustomEvent('ai-usage-updated'));
  } catch { /* ignore */ }
}

/**
 * Increments local usage by 1. Called before the real proxy request (after cache miss).
 * Server headers will overwrite this with authoritative data once the response arrives.
 * This ensures the counter updates even when headers are missing/unavailable.
 */
function incrementAIUsage() {
  try {
    const now = new Date();
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AIUsageStore>;
      if (parsed.periodKey && parsed.period && parsed.limit != null && parsed.remaining != null) {
        const currentKey = parsed.period === 'daily'
          ? now.toISOString().slice(0, 10)
          : now.toISOString().slice(0, 7);
        if (parsed.periodKey === currentKey) {
          // Same period — just decrement remaining
          const entry: AIUsageStore = {
            ...parsed as AIUsageStore,
            remaining: Math.max(0, parsed.remaining - 1),
          };
          localStorage.setItem(AI_USAGE_KEY, JSON.stringify(entry));
          window.dispatchEvent(new CustomEvent('ai-usage-updated'));
          return;
        }
      }
    }
    // No existing entry or period rolled over — start fresh (daily assumption; server will correct)
    const periodKey = now.toISOString().slice(0, 10);
    const limit = config.aiProDailyLimit;
    const entry: AIUsageStore = { remaining: limit - 1, limit, periodKey, period: 'daily' };
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify(entry));
    window.dispatchEvent(new CustomEvent('ai-usage-updated'));
  } catch { /* ignore */ }
}

export function getAIUsage(): { used: number; remaining: number; limit: number; period: 'daily' | 'monthly' } | null {
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AIUsageStore>;
    const { remaining, limit, periodKey, period = 'monthly' } = parsed;
    if (remaining == null || limit == null || !periodKey) return null;
    const now = new Date();
    const currentKey = period === 'daily'
      ? now.toISOString().slice(0, 10)
      : now.toISOString().slice(0, 7);
    if (periodKey !== currentKey) return null;
    return { used: limit - remaining, remaining, limit, period };
  } catch {
    return null;
  }
}

// ─── Proxy path (production managed AI) ─────────────────────────────────────

async function getRecommendationsViaProxy(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  // Send the Supabase session token so the server can identify Pro users and skip rate limiting.
  // AbortError can occur when the Web Locks auth token is contested across tabs — treat as no token.
  const sb = getSupabase();
  let token: string | undefined;
  try {
    token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  } catch (e: any) {
    if (e?.name !== 'AbortError') throw e;
  }

  const res = await fetch(`${config.aiProxyUrl}/api/ai/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });

  // Capture rate limit headers — sync authoritative server data to local store
  const remaining = parseInt(res.headers.get('X-RateLimit-Remaining') ?? '-1');
  const limit = parseInt(res.headers.get('X-RateLimit-Limit') ?? '-1');
  const period = (res.headers.get('X-RateLimit-Period') ?? 'daily') as 'daily' | 'monthly';
  if (remaining >= 0 && limit > 0 && remaining <= limit) storeAIUsage(remaining, limit, period);

  if (res.status === 429) {
    // Mark local store as exhausted so UI blocks further attempts immediately
    if (limit > 0) storeAIUsage(0, limit, period);
    else {
      // No headers on 429 — mark exhausted using whatever we have stored
      const cur = getAIUsage();
      if (cur) storeAIUsage(0, cur.limit, cur.period);
    }
    throw new AILimitReachedError();
  }

  if (!res.ok) {
    throw new Error('AI service temporarily unavailable. Please try again.');
  }

  return res.json();
}

const AI_CONFIG_KEY = 'ai_config';
const AI_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function buildCacheKey(request: AIRecommendationRequest, config: AIConfig): string {
  const q = request.query.trim().toLowerCase();
  const model = config.model ?? config.provider;
  // Stable fingerprint of inputs that materially affect the output
  const fingerprint = JSON.stringify({
    topGenres: request.tasteProfile.topGenres,
    topLanguages: request.tasteProfile.topLanguages,
    topCountries: request.tasteProfile.topCountries,
    topDecades: request.tasteProfile.topDecades,
    disliked_genres: request.contentPreferences.disliked_genres,
    disliked_countries: request.contentPreferences.disliked_countries,
    disliked_languages: request.contentPreferences.disliked_languages,
  });
  // btoa keeps the key compact while remaining unique per distinct input set
  const profileHash = btoa(unescape(encodeURIComponent(fingerprint))).slice(0, 24);
  return `ai_cache:${config.provider}:${model}:${request.language}:${request.count}:${profileHash}:${q}`;
}

function envDefaults(): Partial<AIConfig> {
  const e = (window as Record<string, any>).__ENV__;
  if (!e?.AI_API_KEY) return {};

  const envProvider = e.AI_PROVIDER as string | undefined;
  const allowedProviders: AIProvider[] = ['openai', 'anthropic', 'gemini', 'mistral', 'ollama'];
  const provider: AIProvider = envProvider && allowedProviders.includes(envProvider as AIProvider)
    ? (envProvider as AIProvider)
    : 'openai';

  return {
    enabled: true,
    provider,
    apiKey: e.AI_API_KEY,
    model: e.AI_MODEL || undefined,
    ollamaUrl: e.OLLAMA_URL || undefined,
  };
}

export async function getAIConfig(): Promise<AIConfig> {
  const raw = await getSetting(AI_CONFIG_KEY);
  const defaults = envDefaults();
  const base: AIConfig = { enabled: false, provider: 'openai', apiKey: '', ...defaults };
  if (!raw) return base;
  try {
    // Stored config takes priority over env defaults
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

export async function setAIConfig(config: AIConfig): Promise<void> {
  await setSetting(AI_CONFIG_KEY, JSON.stringify(config));
}

export async function isAIEnabled(): Promise<boolean> {
  const aiConfig = await getAIConfig();
  if (config.hasManagedAI) {
    if (!aiConfig.enabled) return false;
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { data } = await sb.auth.getSession();
      return !!data.session;
    } catch {
      return false;
    }
  }
  return aiConfig.enabled && !!aiConfig.apiKey;
}

export async function getAIRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  // Managed proxy path — production hosted version
  if (config.hasManagedAI) {
    const aiConfig = await getAIConfig();
    if (!aiConfig.enabled) throw new Error('AI is not enabled');

    // Require authentication for managed AI
    const sb = getSupabase();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (!session) throw new Error('Sign in to use AI recommendations');

    // Check persistent cache before calling the proxy
    const cacheKey = buildCacheKey(request, { provider: 'managed', apiKey: '', enabled: true } as any);
    try {
      const cached = await getSetting(cacheKey);
      if (cached) {
        const { results, cachedAt } = JSON.parse(cached);
        if (Date.now() - cachedAt < AI_CACHE_TTL) return results as AIRecommendation[];
      }
    } catch { /* ignore */ }

    // Block immediately if local store already shows limit exhausted
    const usage = getAIUsage();
    if (usage && usage.remaining === 0) throw new AILimitReachedError();

    // Optimistically increment local counter; server headers will sync the real value after
    incrementAIUsage();
    const results = await getRecommendationsViaProxy(request);

    try {
      await setSetting(cacheKey, JSON.stringify({ results, cachedAt: Date.now() }));
    } catch { /* ignore */ }

    return results;
  }

  // BYO-key path — community / dev
  const aiConfig = await getAIConfig();

  if (!aiConfig.enabled || !aiConfig.apiKey) {
    throw new Error('AI is not enabled or API key is missing');
  }

  // Check persistent cache before calling the AI
  const cacheKey = buildCacheKey(request, aiConfig);
  try {
    const cached = await getSetting(cacheKey);
    if (cached) {
      const { results, cachedAt } = JSON.parse(cached);
      if (Date.now() - cachedAt < AI_CACHE_TTL) {
        return results as AIRecommendation[];
      }
    }
  } catch { /* ignore cache read errors */ }

  let client;
  switch (aiConfig.provider) {
    case 'openai':
      client = new OpenAIClient(aiConfig.apiKey, aiConfig.model);
      break;
    case 'anthropic':
      client = new AnthropicClient(aiConfig.apiKey, aiConfig.model);
      break;
    case 'gemini':
      client = new GeminiClient(aiConfig.apiKey, aiConfig.model);
      break;
    case 'mistral':
      client = new MistralClient(aiConfig.apiKey, aiConfig.model);
      break;
    case 'ollama':
      client = new OllamaClient(aiConfig.apiKey, aiConfig.ollamaUrl, aiConfig.model);
      break;
    default:
      throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
  }

  const results = await client.getRecommendations(request);

  // Persist results for 2 hours
  try {
    await setSetting(cacheKey, JSON.stringify({ results, cachedAt: Date.now() }));
  } catch { /* ignore cache write errors */ }

  return results;
}

export type { AIConfig, AIProvider, AIRecommendation };
