import { AIClient } from './base';
import type { AIRecommendationRequest, AIRecommendation } from '../types';

export class OllamaClient extends AIClient {
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    super(apiKey);
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
    const prompt = this.buildPrompt(request);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.response || '';
    return this.parseRecommendations(content);
  }
}
