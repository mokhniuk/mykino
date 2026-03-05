import { getSetting, setSetting } from '../db';
import type { AIConfig, AIProvider, AIRecommendationRequest, AIRecommendation } from './types';
import { OpenAIClient } from './clients/openai';
import { AnthropicClient } from './clients/anthropic';
import { GeminiClient } from './clients/gemini';
import { MistralClient } from './clients/mistral';
import { OllamaClient } from './clients/ollama';

const AI_CONFIG_KEY = 'ai_config';

export async function getAIConfig(): Promise<AIConfig> {
  const raw = await getSetting(AI_CONFIG_KEY);
  if (!raw) {
    return {
      enabled: false,
      provider: 'openai',
      apiKey: '',
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      enabled: false,
      provider: 'openai',
      apiKey: '',
    };
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

  return client.getRecommendations(request);
}

export type { AIConfig, AIProvider, AIRecommendation };
