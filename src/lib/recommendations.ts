import { getContentPreferences, getWatched, getFavourites, type MovieData } from './db';
import { discoverMovies, getRecommendations } from './api';

export async function getPersonalizedRecommendations(lang = 'en'): Promise<MovieData[]> {
    const [prefs, watched, favourites] = await Promise.all([
        getContentPreferences(),
        getWatched(),
        getFavourites()
    ]);

    const watchedIds = new Set(watched.map(m => m.imdbID));
    const dislikedGenreSet = new Set(prefs.disliked_genres);
    const dislikedCountrySet = new Set(prefs.disliked_countries);
    const dislikedLanguageSet = new Set(prefs.disliked_languages);

    // Dislikes are hard constraints — passed to every discover call
    const withoutGenres = prefs.disliked_genres.length > 0 ? prefs.disliked_genres.join(',') : undefined;

    const requests: Promise<MovieData[]>[] = [];

    // 1. Native TMDB recommendations — seeded by most-recently-added favourites/watched
    const seeds = (favourites.length > 0 ? favourites : watched)
        .slice()
        .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
        .slice(0, 3);

    for (const seed of seeds) {
        requests.push(
            getRecommendations(seed.imdbID, seed.Type === 'series' ? 'tv' : 'movie', lang)
        );
    }

    // 2. Genre discover — OR logic (pipe separator), no country/language restriction
    if (prefs.liked_genres.length > 0) {
        requests.push(
            discoverMovies({
                genre: prefs.liked_genres.join('|'),
                without_genres: withoutGenres,
                lang,
                sort_by: 'popularity.desc'
            }).then(r => r.Search ?? [])
        );
    }

    // 3. Per-liked-country discover — separate call each (OR logic), capped at 3
    for (const country of prefs.liked_countries.slice(0, 3)) {
        requests.push(
            discoverMovies({ country, without_genres: withoutGenres, lang, sort_by: 'popularity.desc' })
                .then(r => r.Search ?? [])
        );
    }

    // 4. Per-liked-language discover — separate call each (OR logic), capped at 3
    for (const language of prefs.liked_languages.slice(0, 3)) {
        requests.push(
            discoverMovies({ language, without_genres: withoutGenres, lang, sort_by: 'popularity.desc' })
                .then(r => r.Search ?? [])
        );
    }

    // 5. Fallback if no preferences and no history at all
    if (requests.length === 0) {
        requests.push(
            discoverMovies({ lang, sort_by: 'popularity.desc' }).then(r => r.Search ?? [])
        );
    }

    const allResults = (await Promise.all(requests)).flat();

    // Post-filter: remove watched + anything matching any disliked genre, country, or language
    const filtered = allResults.filter(m => {
        if (watchedIds.has(m.imdbID)) return false;
        if (m.genre_ids?.some(id => dislikedGenreSet.has(id))) return false;
        if (m.origin_country?.some(c => dislikedCountrySet.has(c))) return false;
        if (m.original_language && dislikedLanguageSet.has(m.original_language)) return false;
        return true;
    });

    // Deduplicate by ID
    const unique = Array.from(new Map(filtered.map(m => [m.imdbID, m])).values());

    // Fisher-Yates shuffle (unbiased)
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return unique.slice(0, 20);
}
