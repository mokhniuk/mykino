import { AIClient } from './base';
import type { AIRecommendationRequest, AIRecommendation } from '../types';

export class AnthropicClient extends AIClient {
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    super(apiKey);
    this.model = model;
  }

  async getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
    const prompt = this.buildPrompt(request);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';
    return this.parseRecommendations(content);
  }
}
