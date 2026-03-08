export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'ollama';

export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
  ollamaUrl?: string;
  model?: string;
}

export interface AIRecommendationRequest {
  query: string;
  language: string;
  count: number;
  tasteProfile: {
    topGenres: number[];
    topLanguages: string[];
    topCountries: string[];
    topDecades: string[];
  };
  contentPreferences: {
    liked_genres: number[];
    disliked_genres: number[];
    liked_countries: string[];
    disliked_countries: string[];
    liked_languages: string[];
    disliked_languages: string[];
  };
  favourites: Array<{ Title: string; Year: string; Genre?: string }>;
  watchlist: Array<{ Title: string; Year: string; Genre?: string }>;
  watched: Array<{ Title: string; Year: string }>;
}

export interface AIRecommendation {
  title: string;
  year?: string;
  reason: string;
}
