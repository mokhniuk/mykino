import type { AIRecommendationRequest, AIRecommendation } from '../types';

export abstract class AIClient {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]>;

  protected buildPrompt(request: AIRecommendationRequest): string {
    const { query, language, count, tasteProfile, contentPreferences, favourites, watchlist, watched } = request;

    // Limit exclusion lists to 30 most recent items to reduce token usage.
    // Client-side filtering is the real guard; this is just a hint to the AI.
    const MAX_EXCLUSIONS = 30;
    const watchedTitles = watched.slice(0, MAX_EXCLUSIONS).map(m => `${m.Title} (${m.Year})`).join(', ');
    const watchlistTitles = watchlist.slice(0, MAX_EXCLUSIONS).map(m => `${m.Title} (${m.Year})`).join(', ');
    const watchedNote = watched.length > MAX_EXCLUSIONS ? ` (${watched.length - MAX_EXCLUSIONS} more not shown)` : '';
    const watchlistNote = watchlist.length > MAX_EXCLUSIONS ? ` (${watchlist.length - MAX_EXCLUSIONS} more not shown)` : '';

    return `You are a movie recommendation expert. Based on the user's taste profile and query, recommend movies or TV shows.

IMPORTANT: The "reason" field MUST be written in ${language}.
IMPORTANT: Use ENGLISH or ORIGINAL titles only — never translated titles.
CRITICAL: Provide EXACTLY ${count} UNIQUE recommendations, no more, no less.

User Query: "${query}"

🚫 ABSOLUTE EXCLUSIONS:

Already Watched (${watched.length} total${watchedNote}): ${watchedTitles}
In Watchlist (${watchlist.length} total${watchlistNote}): ${watchlistTitles}
Disliked Countries: ${contentPreferences.disliked_countries.join(', ') || 'none'}
Disliked Genres: ${contentPreferences.disliked_genres.join(', ') || 'none'}

✅ User's Taste Profile:
- Favorite Genres: ${tasteProfile.topGenres.join(', ')}
- Favorite Languages: ${tasteProfile.topLanguages.join(', ')}
- Favorite Countries: ${tasteProfile.topCountries.join(', ')}
- Favorite Decades: ${tasteProfile.topDecades.join(', ')}

Favorite Movies: ${favourites.slice(0, 5).map(m => `${m.Title} (${m.Year})`).join(', ')}

Return a JSON array of EXACTLY ${count} unique items:
[{"title":"...","year":"...","reason":"...in ${language}..."}]

Rules: no duplicates, no excluded titles, no disliked countries/genres, varied results, JSON only.`;
  }

  protected parseRecommendations(response: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(response);
      // Handle JSON mode responses: bare array or object wrapping an array
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : Object.values(parsed).find(v => Array.isArray(v)) as any[];
      if (!Array.isArray(arr)) throw new Error('No array found in response');
      return arr.filter((r: any) => r.title && r.reason);
    } catch {
      // Fallback: extract JSON array from free-text response
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        const recommendations = JSON.parse(jsonMatch[0]);
        return recommendations.filter((r: any) => r.title && r.reason);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('Failed to parse recommendations from AI response');
      }
    }
  }
}
