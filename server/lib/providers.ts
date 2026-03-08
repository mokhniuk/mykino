import type { AIRecommendationRequest, AIRecommendation } from './types';
import { buildPrompt, parseRecommendations } from './prompt';

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'mistral' | 'ollama';

/** Detects the configured AI provider from environment variables. */
export function detectProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY)    return 'openai';
  if (process.env.GEMINI_API_KEY)    return 'gemini';
  if (process.env.MISTRAL_API_KEY)   return 'mistral';
  if (process.env.OLLAMA_BASE_URL)   return 'ollama';
  throw new Error('No AI provider configured. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, OLLAMA_BASE_URL');
}

export async function getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
  const provider = detectProvider();
  const prompt = buildPrompt(request);
  const model = process.env.AI_MODEL;

  let raw: string;

  switch (provider) {
    case 'anthropic':
      raw = await callAnthropic(prompt, model);
      break;
    case 'openai':
      raw = await callOpenAI(prompt, model);
      break;
    case 'gemini':
      raw = await callGemini(prompt, model);
      break;
    case 'mistral':
      raw = await callMistral(prompt, model);
      break;
    case 'ollama':
      raw = await callOllama(prompt, model);
      break;
  }

  return parseRecommendations(raw);
}

async function callAnthropic(prompt: string, model?: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content[0]?.text ?? '';
}

async function callOpenAI(prompt: string, model?: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a movie recommendation expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

async function callGemini(prompt: string, model?: string): Promise<string> {
  const m = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callMistral(prompt: string, model?: string): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'mistral-small-latest',
      messages: [
        { role: 'system', content: 'You are a movie recommendation expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`Mistral error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

async function callOllama(prompt: string, model?: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3.2',
      prompt,
      stream: false,
      format: 'json',
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.response ?? '';
}
