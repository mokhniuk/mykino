import { getContentPreferences, getWatched, getFavourites, type MovieData } from './db';
import { discoverMovies, getRecommendations } from './api';

export async function getPersonalizedRecommendations(lang = 'en'): Promise<MovieData[]> {
    const [prefs, watched, favourites] = await Promise.all([
        getContentPreferences(),
        getWatched(),
        getFavourites()
    ]);

    const watchedIds = new Set(watched.map(m => m.imdbID));
    const favouriteIds = new Set(favourites.map(m => m.imdbID));

    // 1. Get native recommendations based on favourites or recent watched
    const seeds = favourites.length > 0
        ? favourites.sort(() => 0.5 - Math.random()).slice(0, 2)
        : watched.sort(() => 0.5 - Math.random()).slice(0, 1);

    const nativePromises = seeds.map(m => getRecommendations(m.imdbID, m.Type === 'series' ? 'tv' : 'movie', lang));
    const nativeResultsSets = await Promise.all(nativePromises);
    const nativeResults = nativeResultsSets.flat();

    // 2. Use Discover as the primary preference engine
    const genreIds = prefs.liked_genres.length > 0 ? prefs.liked_genres.join(',') : undefined;
    const withoutGenreIds = prefs.disliked_genres.length > 0 ? prefs.disliked_genres.join(',') : undefined;
    const country = prefs.liked_countries.length > 0 ? prefs.liked_countries[0] : undefined;
    const withoutCountry = prefs.disliked_countries.length > 0 ? prefs.disliked_countries[0] : undefined;
    const language = prefs.liked_languages.length > 0 ? prefs.liked_languages[0] : undefined;
    const withoutLanguage = prefs.disliked_languages.length > 0 ? prefs.disliked_languages[0] : undefined;

    const discoverResults = await discoverMovies({
        genre: genreIds,
        without_genres: withoutGenreIds,
        country: country,
        without_country: withoutCountry,
        language: language,
        without_language: withoutLanguage,
        lang,
        page: 1,
        sort_by: 'popularity.desc'
    });

    const discoverItems = discoverResults.Search || [];

    // Mix and filter
    // We want to prioritize native recommendations but also respect dislikes
    const dislikedGenreSet = new Set(prefs.disliked_genres);

    let combined = [...nativeResults, ...discoverItems];

    // Filter: Not watched, not disliked (if genre info is available)
    const finalResults = combined.filter(m => {
        if (watchedIds.has(m.imdbID)) return false;

        // If it has genre_ids, check against dislikes
        if (m.genre_ids && m.genre_ids.some(id => dislikedGenreSet.has(id))) return false;

        return true;
    });

    // De-duplicate by ID
    const unique = Array.from(new Map(finalResults.map(m => [m.imdbID, m])).values());

    // If we have very few results, try a broader discover (top 100 movies or just liked genres)
    if (unique.length < 5 && genreIds) {
        const broader = await discoverMovies({
            genre: genreIds,
            without_genres: withoutGenreIds,
            lang,
            page: 1
        });
        const broaderFiltered = (broader.Search || []).filter(m => !watchedIds.has(m.imdbID));
        unique.push(...broaderFiltered);
    }

    // Final shuffle and take 20
    return unique.sort(() => 0.5 - Math.random()).slice(0, 20);
}
