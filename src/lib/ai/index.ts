import { getSetting, setSetting } from '../db';
import { config } from '../config';
import type { AIConfig, AIProvider, AIRecommendationRequest, AIRecommendation } from './types';
import { OpenAIClient } from './clients/openai';
import { AnthropicClient } from './clients/anthropic';
import { GeminiClient } from './clients/gemini';
import { MistralClient } from './clients/mistral';
import { OllamaClient } from './clients/ollama';

// ─── AI usage tracking (for managed proxy mode) ─────────────────────────────

const AI_USAGE_KEY = 'ai_proxy_usage';

interface AIUsageStore {
  remaining: number;
  limit: number;
  date: string;
}

function storeAIUsage(remaining: number, limit: number) {
  try {
    const entry: AIUsageStore = { remaining, limit, date: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify(entry));
  } catch { /* ignore */ }
}

export function getAIUsage(): { used: number; remaining: number; limit: number } | null {
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (!raw) return null;
    const { remaining, limit, date } = JSON.parse(raw) as AIUsageStore;
    if (date !== new Date().toISOString().slice(0, 10)) return null;
    return { used: limit - remaining, remaining, limit };
  } catch {
    return null;
  }
}

// ─── Proxy path (production managed AI) ─────────────────────────────────────

async function getRecommendationsViaProxy(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  const res = await fetch(`${config.aiProxyUrl}/api/ai/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  // Capture rate limit headers for display in Settings
  const remaining = parseInt(res.headers.get('X-RateLimit-Remaining') ?? '-1');
  const limit = parseInt(res.headers.get('X-RateLimit-Limit') ?? '-1');
  if (remaining >= 0 && limit > 0) storeAIUsage(remaining, limit);

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const resetAt = body.resetAt ? new Date(body.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'midnight';
    throw new Error(`Daily recommendation limit reached. Resets at ${resetAt}.`);
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
  return `ai_cache:${config.provider}:${model}:${request.language}:${request.count}:${request.watched.length}:${profileHash}:${q}`;
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
  if (config.hasManagedAI) return aiConfig.enabled;
  return aiConfig.enabled && !!aiConfig.apiKey;
}

export async function getAIRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  // Managed proxy path — production hosted version
  if (config.hasManagedAI) {
    const aiConfig = await getAIConfig();
    if (!aiConfig.enabled) throw new Error('AI is not enabled');

    // Check persistent cache before calling the proxy
    const cacheKey = buildCacheKey(request, { provider: 'managed', apiKey: '', enabled: true } as any);
    try {
      const cached = await getSetting(cacheKey);
      if (cached) {
        const { results, cachedAt } = JSON.parse(cached);
        if (Date.now() - cachedAt < AI_CACHE_TTL) return results as AIRecommendation[];
      }
    } catch { /* ignore */ }

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
