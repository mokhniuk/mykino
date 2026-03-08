import { AIClient } from './base';
import type { AIRecommendationRequest, AIRecommendation } from '../types';

export class GeminiClient extends AIClient {
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    super(apiKey);
    this.model = model;
  }

  async getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
    const prompt = this.buildPrompt(request);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text || '';
    return this.parseRecommendations(content);
  }
}
