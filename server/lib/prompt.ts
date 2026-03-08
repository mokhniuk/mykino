import type { AIRecommendationRequest } from './types';

const MAX_EXCLUSIONS = 30;

export function buildPrompt(request: AIRecommendationRequest): string {
  const { query, language, count, tasteProfile, contentPreferences, favourites, watchlist, watched } = request;

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

export function parseRecommendations(response: string) {
  try {
    const parsed = JSON.parse(response);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : Object.values(parsed).find(v => Array.isArray(v)) as any[];
    if (!Array.isArray(arr)) throw new Error('No array found');
    return arr.filter((r: any) => r.title && r.reason);
  } catch {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    return JSON.parse(jsonMatch[0]).filter((r: any) => r.title && r.reason);
  }
}
