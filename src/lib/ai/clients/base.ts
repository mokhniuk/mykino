import type { AIRecommendationRequest, AIRecommendation } from '../types';

export abstract class AIClient {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract getRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]>;

  protected buildPrompt(request: AIRecommendationRequest): string {
    const { query, tasteProfile, contentPreferences, favourites, watchlist, watched } = request;

    // Extract language instruction from query if present
    const langMatch = query.match(/Respond in (\w+)\./);
    const language = langMatch ? langMatch[1] : 'English';
    
    // Extract number of recommendations requested
    const countMatch = query.match(/exactly (\d+)/i) || query.match(/Give (\d+)/i);
    const count = countMatch ? countMatch[1] : '15';

    // Build exclusion lists
    const watchedTitles = watched.map(m => `${m.Title} (${m.Year})`).join(', ');
    const watchlistTitles = watchlist.map(m => `${m.Title} (${m.Year})`).join(', ');

    return `You are a movie recommendation expert. Based on the user's taste profile and query, recommend movies or TV shows.

IMPORTANT: All explanations and reasons MUST be written in ${language}. The "reason" field in your response must be in ${language}.

CRITICAL: You MUST provide EXACTLY ${count} UNIQUE recommendations - NO DUPLICATES, NO MORE, NO LESS.

User Query: "${query}"

🚫 ABSOLUTE EXCLUSIONS - DO NOT RECOMMEND THESE:

Already Watched (${watched.length} movies):
${watchedTitles}

In Watchlist (${watchlist.length} movies):
${watchlistTitles}

Disliked Countries: ${contentPreferences.disliked_countries.join(', ')}
Disliked Genres: ${contentPreferences.disliked_genres.join(', ')}

✅ User's Taste Profile:
- Favorite Genres: ${tasteProfile.topGenres.join(', ')}
- Favorite Languages: ${tasteProfile.topLanguages.join(', ')}
- Favorite Countries: ${tasteProfile.topCountries.join(', ')}
- Favorite Decades: ${tasteProfile.topDecades.join(', ')}

Favorite Movies (examples):
${favourites.slice(0, 5).map(m => `- ${m.Title} (${m.Year})`).join('\n')}

Provide EXACTLY ${count} movie recommendations in JSON format (the "reason" field MUST be in ${language}):
[
  {
    "title": "Movie Title",
    "year": "2020",
    "reason": "Brief explanation in ${language} why this matches the user's taste"
  }
]

CRITICAL REQUIREMENTS:
1. YOU MUST provide EXACTLY ${count} recommendations - count them before responding
2. Each movie must be COMPLETELY UNIQUE - check for duplicates before responding
3. DO NOT recommend ANY movie from the "Already Watched" or "In Watchlist" lists above
4. DO NOT recommend movies from disliked countries or genres
5. Ensure variety and diversity in your recommendations
6. Only return valid JSON array, no additional text

Your response must be a JSON array with EXACTLY ${count} UNIQUE items.`;
  }

  protected parseRecommendations(response: string): AIRecommendation[] {
    try {
      // Try to extract JSON from response
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
