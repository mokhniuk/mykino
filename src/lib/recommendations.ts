import { getContentPreferences, getWatched, getFavourites, type MovieData } from './db';
import { discoverMovies, getRecommendations, getTrending } from './api';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key: string): MovieData[] | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { data, cachedAt } = JSON.parse(raw) as { data: MovieData[]; cachedAt: number };
        if (Date.now() - cachedAt > CACHE_TTL) {
            sessionStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCached(key: string, data: MovieData[]) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch {
        // sessionStorage might be full or disabled
    }
}

export function clearRecommendationsCache(lang = 'en') {
    sessionStorage.removeItem(`reco_${lang}`);
}

export async function getPersonalizedRecommendations(lang = 'en'): Promise<MovieData[]> {
    const cacheKey = `reco_${lang}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const [prefs, watched, favourites] = await Promise.all([
        getContentPreferences(),
        getWatched(),
        getFavourites(),
    ]);

    const watchedIds = new Set(watched.map(m => m.imdbID));
    const dislikedGenreSet = new Set(prefs.disliked_genres);
    const dislikedCountrySet = new Set(prefs.disliked_countries);
    const dislikedLanguageSet = new Set(prefs.disliked_languages);

    const withoutGenres = prefs.disliked_genres.length > 0 ? prefs.disliked_genres.join(',') : undefined;

    const requests: Promise<MovieData[]>[] = [];

    // 1. Trending this week — always included as the "what's popular now" signal
    requests.push(getTrending(lang));

    // 2. Native TMDB recommendations from most-recently-added favourites / watched
    const seeds = (favourites.length > 0 ? favourites : watched)
        .slice()
        .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
        .slice(0, 3);

    for (const seed of seeds) {
        requests.push(
            getRecommendations(seed.imdbID, seed.Type === 'series' ? 'tv' : 'movie', lang)
        );
    }

    // 3. Genre discover — OR logic (pipe separator), no country/language restriction
    if (prefs.liked_genres.length > 0) {
        requests.push(
            discoverMovies({
                genre: prefs.liked_genres.join('|'),
                without_genres: withoutGenres,
                lang,
                sort_by: 'popularity.desc',
            }).then(r => r.Search ?? [])
        );
    }

    // 4. Per-liked-country discover — separate call each (OR logic), capped at 3
    for (const country of prefs.liked_countries.slice(0, 3)) {
        requests.push(
            discoverMovies({ country, without_genres: withoutGenres, lang, sort_by: 'popularity.desc' })
                .then(r => r.Search ?? [])
        );
    }

    // 5. Per-liked-language discover — separate call each (OR logic), capped at 3
    for (const language of prefs.liked_languages.slice(0, 3)) {
        requests.push(
            discoverMovies({ language, without_genres: withoutGenres, lang, sort_by: 'popularity.desc' })
                .then(r => r.Search ?? [])
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

    // Fisher-Yates shuffle
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    const result = unique.slice(0, 100);
    setCached(cacheKey, result);
    return result;
}
