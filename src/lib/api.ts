// ─────────────────────────────────────────────────────────────────────────────
// Movie API abstraction layer
//
// All pages import from here, not from the provider directly.
// To swap providers: change the import path below to another module that
// exports the same { searchMovies, getMovieDetails, SearchResult } shape.
// ─────────────────────────────────────────────────────────────────────────────

export { searchMovies, getMovieDetails } from './tmdb';
export type { SearchResult } from './tmdb';
