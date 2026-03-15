// ─────────────────────────────────────────────────────────────────────────────
// Movie API abstraction layer
//
// All pages import from here, not from the provider directly.
// To swap providers: change the import path below to another module that
// exports the same { searchMovies, getMovieDetails, SearchResult } shape.
// ─────────────────────────────────────────────────────────────────────────────

export { searchMovies, getMovieDetails, getWatchProviders, detectCountry, PROVIDER_LOGO_BASE, getGenres, getCountries, getLanguages, discoverMovies, getRecommendations, getTrending, getSimilar, getNowPlaying, getPopular, getDirectorMovies, fetchCollectionMovies } from './tmdb';
export type { SearchResult, WatchProviderResult, WatchProvider } from './tmdb';
export { COLLECTIONS, getCollectionBySlug, getCollectionsByType, FREE_COLLECTIONS_LIMIT } from './collections';
export type { Collection, CollectionType, CollectionRules } from './collections';
