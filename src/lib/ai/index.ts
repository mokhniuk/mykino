import { getSetting, setSetting } from '../db';
import type { AIConfig, AIProvider, AIRecommendationRequest, AIRecommendation } from './types';
import { OpenAIClient } from './clients/openai';
import { AnthropicClient } from './clients/anthropic';
import { GeminiClient } from './clients/gemini';
import { MistralClient } from './clients/mistral';
import { OllamaClient } from './clients/ollama';

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
  const config = await getAIConfig();
  return config.enabled && !!config.apiKey;
}

export async function getAIRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  const config = await getAIConfig();

  if (!config.enabled || !config.apiKey) {
    throw new Error('AI is not enabled or API key is missing');
  }

  // Check persistent cache before calling the AI
  const cacheKey = buildCacheKey(request, config);
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
  switch (config.provider) {
    case 'openai':
      client = new OpenAIClient(config.apiKey, config.model);
      break;
    case 'anthropic':
      client = new AnthropicClient(config.apiKey, config.model);
      break;
    case 'gemini':
      client = new GeminiClient(config.apiKey, config.model);
      break;
    case 'mistral':
      client = new MistralClient(config.apiKey, config.model);
      break;
    case 'ollama':
      client = new OllamaClient(config.apiKey, config.ollamaUrl, config.model);
      break;
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  const results = await client.getRecommendations(request);

  // Persist results for 2 hours
  try {
    await setSetting(cacheKey, JSON.stringify({ results, cachedAt: Date.now() }));
  } catch { /* ignore cache write errors */ }

  return results;
}

export type { AIConfig, AIProvider, AIRecommendation };
