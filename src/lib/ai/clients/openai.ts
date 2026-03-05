import { AIClient } from './base';
import type { AIRecommendationRequest, AIRecommendation } from '../types';

export class OpenAIClient extends AIClient {
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    super(apiKey);
    this.model = model;
  }

  async getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
    const prompt = this.buildPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a movie recommendation expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    return this.parseRecommendations(content);
  }
}
