import { cacheMovie, getCachedMovie, type MovieData } from './db';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const PROVIDER_LOGO_BASE = 'https://image.tmdb.org/t/p/w45';
const API_KEY: string | undefined =
  (window as Record<string, any>).__ENV__?.TMDB_API_KEY ||
  import.meta.env.VITE_TMDB_API_KEY;

/** Maps app language codes to TMDB locale strings */
const TMDB_LANG: Record<string, string> = {
  en: 'en-US',
  ua: 'uk-UA',
  de: 'de-DE',
  cs: 'cs-CZ',
  pl: 'pl-PL',
  pt: 'pt-BR',
};


// ─── Internal TMDB types ─────────────────────────────────────────────────────

interface TmdbSearchItem {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  genre_ids?: number[];
  origin_country?: string[];
  original_language?: string;
  known_for?: TmdbSearchItem[];
}

interface TmdbGenre { id: number; name: string; }
interface TmdbCastMember { name: string; order: number; }
interface TmdbCrewMember { job: string; department: string; name: string; }
interface TmdbCredits { cast: TmdbCastMember[]; crew: TmdbCrewMember[]; }

interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  spoken_languages: { english_name: string }[];
  production_countries: { name: string; iso_3166_1: string }[];
  revenue: number;
  credits: TmdbCredits;
  videos?: { results: TmdbVideo[] };
}

interface TmdbTVDetail {
  id: number;
  name: string;
  original_name: string;
  original_language: string;
  first_air_date: string;
  poster_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  spoken_languages: { english_name: string }[];
  production_countries: { name: string; iso_3166_1: string }[];
  number_of_seasons: number;
  credits: TmdbCredits;
  videos?: { results: TmdbVideo[] };
}

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  iso_639_1: string;
}

interface TmdbFindResult {
  movie_results: Array<{ id: number }>;
  tv_results: Array<{ id: number }>;
}

// ─── Watch Provider types ─────────────────────────────────────────────────────

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviderResult {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function posterUrl(path: string | null): string {
  return path ? `${IMAGE_BASE}${path}` : 'N/A';
}

function mapCredits(credits?: TmdbCredits) {
  const director = credits?.crew
    .filter(c => c.job === 'Director')
    .map(c => c.name)
    .join(', ') || undefined;
  const writer = credits?.crew
    .filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job))
    .slice(0, 3)
    .map(c => c.name)
    .join(', ') || undefined;
  const actors = credits?.cast
    .slice(0, 5)
    .map(c => c.name)
    .join(', ') || undefined;
  return { director, writer, actors };
}

function getBestTrailer(videos?: { results: TmdbVideo[] }): string | undefined {
  if (!videos?.results) return undefined;
  // Prioritize "Trailer" on "YouTube"
  const trailers = videos.results.filter(v => v.type === 'Trailer' && v.site === 'YouTube');
  if (trailers.length > 0) return trailers[0].key;
  // Fallback to any YouTube video if no "Trailer" type
  const youtubeVideos = videos.results.filter(v => v.site === 'YouTube');
  return youtubeVideos[0]?.key;
}

function mapMovieDetail(data: TmdbMovieDetail, storeId: string): MovieData {
  const { director, writer, actors } = mapCredits(data.credits);
  // Ensure storeId is prefixed appropriately if it lacks a prefix and isn't a tt- id
  const finalId = storeId.startsWith('tt') || storeId.startsWith('m-') ? storeId : `m-${storeId}`;
  return {
    imdbID: finalId,
    Title: data.title,
    OriginalTitle: data.original_title !== data.title ? data.original_title : undefined,
    Year: data.release_date?.slice(0, 4) ?? '',
    Poster: posterUrl(data.poster_path),
    Type: 'movie',
    Plot: data.overview || undefined,
    Genre: data.genres?.map(g => g.name).join(', ') || undefined,
    Runtime: data.runtime ? `${data.runtime} min` : undefined,
    imdbRating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
    imdbVotes: data.vote_count ? String(data.vote_count) : undefined,
    Director: director,
    Writer: writer,
    Actors: actors,
    Language: data.spoken_languages?.map(l => l.english_name).join(', ') || undefined,
    Country: data.production_countries?.map(c => c.name).join(', ') || undefined,
    Released: data.release_date || undefined,
    BoxOffice: data.revenue ? `$${data.revenue.toLocaleString()}` : undefined,
    TrailerKey: getBestTrailer(data.videos),
    genre_ids: data.genres?.map(g => g.id),
    original_language: data.original_language,
    origin_country: data.production_countries?.map(c => c.iso_3166_1),
  };
}

function mapTVDetail(data: TmdbTVDetail, storeId: string): MovieData {
  const { writer, actors } = mapCredits(data.credits);
  const creator = data.credits?.crew
    .filter(c => c.job === 'Creator')
    .map(c => c.name)
    .join(', ') || undefined;
  const runtime = data.episode_run_time?.[0];
  // Ensure storeId is prefixed appropriately if it lacks a prefix and isn't a tt- id
  const finalId = storeId.startsWith('tt') || storeId.startsWith('tv-') ? storeId : `tv-${storeId}`;
  return {
    imdbID: finalId,
    Title: data.name,
    OriginalTitle: data.original_name !== data.name ? data.original_name : undefined,
    Year: data.first_air_date?.slice(0, 4) ?? '',
    Poster: posterUrl(data.poster_path),
    Type: 'series',
    Plot: data.overview || undefined,
    Genre: data.genres?.map(g => g.name).join(', ') || undefined,
    Runtime: runtime ? `${runtime} min` : undefined,
    imdbRating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
    imdbVotes: data.vote_count ? String(data.vote_count) : undefined,
    Director: creator,
    Writer: writer,
    Actors: actors,
    Language: data.spoken_languages?.map(l => l.english_name).join(', ') || undefined,
    Country: data.production_countries?.map(c => c.name).join(', ') || undefined,
    Released: data.first_air_date || undefined,
    TrailerKey: getBestTrailer(data.videos),
    genre_ids: data.genres?.map(g => g.id),
    original_language: data.original_language,
    origin_country: data.production_countries?.map(c => c.iso_3166_1),
  };
}

function mapTmdbItemToMovieData(item: TmdbSearchItem, type: 'movie' | 'tv' | 'series' = 'movie'): MovieData {
  const isTV = type === 'tv' || type === 'series' || item.media_type === 'tv';
  const prefix = isTV ? 'tv-' : 'm-';
  return {
    imdbID: `${prefix}${item.id}`,
    Title: isTV ? (item.name ?? '') : (item.title ?? ''),
    Year: (isTV ? item.first_air_date : item.release_date)?.slice(0, 4) ?? '',
    Poster: posterUrl(item.poster_path),
    Type: isTV ? 'series' : 'movie',
    imdbRating: item.vote_average ? item.vote_average.toFixed(1) : undefined,
    Plot: item.overview || undefined,
    genre_ids: item.genre_ids,
    origin_country: item.origin_country,
    original_language: item.original_language,
  };
}

async function tmdbFetch<T>(path: string, lang?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const langParam = lang ? `&language=${lang}` : '';
  const res = await fetch(`${BASE_URL}${path}${sep}api_key=${API_KEY}${langParam}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SearchResult {
  Search?: MovieData[];
  totalResults?: string;
  Response: string;
  Error?: string;
}

export async function searchMovies(query: string, page = 1, lang = 'en'): Promise<SearchResult> {
  if (!API_KEY) return { Response: 'False', Error: 'VITE_TMDB_API_KEY is not configured' };
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    let data = await tmdbFetch<{ results: TmdbSearchItem[]; total_results: number }>(
      `/search/multi?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
      tmdbLang
    );

    // Fallback if no results and query is long (potential specific title)
    // /search/multi can sometimes be less precise for long strings than direct movie/tv search
    if (data.results.length === 0 && query.trim().length > 15) {
      try {
        const movieResults = await tmdbFetch<{ results: TmdbSearchItem[]; total_results: number }>(
          `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
          tmdbLang
        );
        if (movieResults.results.length > 0) {
          data = {
            results: movieResults.results.map(r => ({ ...r, media_type: 'movie' as const })),
            total_results: movieResults.total_results
          };
        } else {
          const tvResults = await tmdbFetch<{ results: TmdbSearchItem[]; total_results: number }>(
            `/search/tv?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
            tmdbLang
          );
          if (tvResults.results.length > 0) {
            data = {
              results: tvResults.results.map(r => ({ ...r, media_type: 'tv' as const })),
              total_results: tvResults.total_results
            };
          }
        }
      } catch (e) {
        console.error('Search fallback failed:', e);
      }
    }

    const allItems: TmdbSearchItem[] = [];
    for (const r of data.results) {
      if (r.media_type === 'movie' || r.media_type === 'tv') {
        allItems.push(r);
      } else if (r.media_type === 'person' && r.known_for) {
        // Add person's known for items if they are movies or tv shows
        allItems.push(...r.known_for.filter(kf => kf.media_type === 'movie' || kf.media_type === 'tv'));
      }
    }

    // De-duplicate results by ID and media type
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const movies: MovieData[] = uniqueItems.map(r => mapTmdbItemToMovieData(r, r.media_type as 'movie' | 'tv'));

    for (const movie of movies) {
      const existing = await getCachedMovie(movie.imdbID);
      if (!existing) await cacheMovie({ ...movie, _lang: lang });
    }

    return { Response: 'True', Search: movies, totalResults: String(data.total_results) };
  } catch (err) {
    return { Response: 'False', Error: String(err) };
  }
}

export async function getMovieDetails(id: string, lang = 'en'): Promise<MovieData | null> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  const cached = await getCachedMovie(id);

  // Return cached only if full details are present
  // We relax the language check: if _lang is missing, we assume it's "legacy" and acceptable
  // to avoid mass re-fetching of history.
  if (cached?.Plot !== undefined && (cached as Record<string, any>)._full === true) {
    const cachedLang = (cached as Record<string, any>)._lang;
    if (!cachedLang || cachedLang === lang) {
      return cached;
    }
  }

  if (!API_KEY) return cached ?? null;

  try {
    if (id.startsWith('tt')) {
      // IMDb ID → resolve via TMDB /find endpoint, keep original id as the cache key
      const found = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`, tmdbLang);

      if (found.movie_results.length > 0) {
        const tmdbId = String(found.movie_results[0].id);
        const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}?append_to_response=credits,videos`, tmdbLang);
        let movie = mapMovieDetail(detail, id);
        movie._full = true;

        // Fallback for trailers
        if (!movie.TrailerKey && lang !== 'en') {
          try {
            const originalDetail = await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}?append_to_response=videos`, 'en-US');
            const originalTrailer = getBestTrailer(originalDetail.videos);
            if (originalTrailer) {
              movie = { ...movie, TrailerKey: originalTrailer };
            }
          } catch { /* ignore fallback error */ }
        }

        await cacheMovie({ ...movie, _lang: lang });
        return movie;
      }
      if (found.tv_results.length > 0) {
        const tmdbId = String(found.tv_results[0].id);
        const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${tmdbId}?append_to_response=credits,videos`, tmdbLang);
        let movie = mapTVDetail(detail, id);
        movie._full = true;

        // Fallback for trailers
        if (!movie.TrailerKey && lang !== 'en') {
          try {
            const originalDetail = await tmdbFetch<TmdbTVDetail>(`/tv/${tmdbId}?append_to_response=videos`, 'en-US');
            const originalTrailer = getBestTrailer(originalDetail.videos);
            if (originalTrailer) {
              movie = { ...movie, TrailerKey: originalTrailer };
            }
          } catch { /* ignore fallback error */ }
        }

        await cacheMovie({ ...movie, _lang: lang });
        return movie;
      }
      return cached ?? null;
    }

    // TMDB numeric (or prefixed) ID — use Type from cache to pick the right endpoint or infer from prefix
    const isTV = cached?.Type === 'series' || id.startsWith('tv-');
    const rawId = id.replace(/^(m-|tv-)/, '');

    if (isTV) {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${rawId}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapTVDetail(detail, id);
      movie._full = true;

      // Fallback for series trailers
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbTVDetail>(`/tv/${rawId}?append_to_response=videos`, 'en-US');
          const originalTrailer = getBestTrailer(originalDetail.videos);
          if (originalTrailer) {
            movie = { ...movie, TrailerKey: originalTrailer };
          }
        } catch { /* ignore fallback error */ }
      }

      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    }

    // Default: try movie, fall back to TV
    try {
      const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${rawId}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapMovieDetail(detail, id);
      movie._full = true;

      // Fallback for trailers: if localized trailer is missing, try fetching original (English)
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbMovieDetail>(`/movie/${rawId}?append_to_response=videos`, 'en-US');
          const originalTrailer = getBestTrailer(originalDetail.videos);
          if (originalTrailer) {
            movie = { ...movie, TrailerKey: originalTrailer };
          }
        } catch { /* ignore fallback error */ }
      }

      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    } catch {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${rawId}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapTVDetail(detail, id);
      movie._full = true;

      // Fallback for series trailers
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbTVDetail>(`/tv/${rawId}?append_to_response=videos`, 'en-US');
          const originalTrailer = getBestTrailer(originalDetail.videos);
          if (originalTrailer) {
            movie = { ...movie, TrailerKey: originalTrailer };
          }
        } catch { /* ignore fallback error */ }
      }

      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    }
  } catch {
    return cached ?? null;
  }
}

/** Returns all watch providers for a title, keyed by country code (e.g. "US", "UA"). */
export async function getWatchProviders(
  id: string,
  type: string,
): Promise<Record<string, WatchProviderResult> | null> {
  if (!API_KEY) return null;

  try {
    let tmdbId = id.replace(/^(m-|tv-)+/, '');
    let mediaType = type === 'series' || id.startsWith('tv-') ? 'tv' : 'movie';

    if (id.startsWith('tt')) {
      const found = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`);
      if (found.movie_results.length > 0) {
        tmdbId = String(found.movie_results[0].id);
        mediaType = 'movie';
      } else if (found.tv_results.length > 0) {
        tmdbId = String(found.tv_results[0].id);
        mediaType = 'tv';
      } else {
        return null;
      }
    }

    const data = await tmdbFetch<{ results: Record<string, WatchProviderResult> }>(
      `/${mediaType}/${tmdbId}/watch/providers`
    );
    return data.results ?? null;
  } catch {
    return null;
  }
}

/** Detects the user's country code via IP geolocation. Cached in sessionStorage. */
export async function detectCountry(): Promise<string> {
  const cached = sessionStorage.getItem('detectedCountry');
  if (cached) return cached;
  try {
    const res = await fetch('https://api.country.is/');
    const data = await res.json() as { country?: string };
    const code = data.country ?? 'US';
    sessionStorage.setItem('detectedCountry', code);
    return code;
  } catch {
    return 'US';
  }
}

export async function getGenres(lang = 'en'): Promise<Record<string, { id: number, name: string }[]>> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list', tmdbLang),
      tmdbFetch<{ genres: TmdbGenre[] }>('/genre/tv/list', tmdbLang)
    ]);
    return {
      movie: movieGenres.genres,
      tv: tvGenres.genres
    };
  } catch {
    return { movie: [], tv: [] };
  }
}

export async function getCountries(lang = 'en'): Promise<{ iso_3166_1: string, english_name: string, native_name: string }[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    return await tmdbFetch<{ iso_3166_1: string, english_name: string, native_name: string }[]>(
      '/configuration/countries',
      tmdbLang
    );
  } catch {
    return [];
  }
}

export async function getLanguages(lang = 'en'): Promise<{ iso_639_1: string, english_name: string, name: string }[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    return await tmdbFetch<{ iso_639_1: string, english_name: string, name: string }[]>(
      '/configuration/languages',
      tmdbLang
    );
  } catch {
    return [];
  }
}

export async function getTrending(lang = 'en', page = 1): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<{ results: TmdbSearchItem[] }>(`/trending/movie/week?page=${page}`, tmdbLang),
      tmdbFetch<{ results: TmdbSearchItem[] }>(`/trending/tv/week?page=${page}`, tmdbLang),
    ]);
    return [
      ...movieData.results.map(r => mapTmdbItemToMovieData({ ...r, media_type: 'movie' }, 'movie')),
      ...tvData.results.map(r => mapTmdbItemToMovieData({ ...r, media_type: 'tv' }, 'tv')),
    ];
  } catch {
    return [];
  }
}

export async function getRecommendations(id: string, type: 'movie' | 'tv' = 'movie', lang = 'en', page = 1): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    // We need to find the TMDB ID first if we only have imdbID
    let tmdbId = id.replace(/^(m-|tv-)+/, '');
    const actualType = id.startsWith('tv-') ? 'tv' : id.startsWith('m-') ? 'movie' : type;

    if (id.startsWith('tt')) {
      const findRes = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`);
      const results = actualType === 'movie' ? findRes.movie_results : findRes.tv_results;
      if (results.length === 0) return [];
      tmdbId = String(results[0].id);
    }

    const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(
      `/${actualType}/${tmdbId}/recommendations?page=${page}`,
      tmdbLang
    );
    return data.results.map(item => mapTmdbItemToMovieData(item, actualType));
  } catch {
    return [];
  }
}

export async function getSimilar(id: string, type: 'movie' | 'tv' = 'movie', lang = 'en', page = 1): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    let tmdbId = id.replace(/^(m-|tv-)+/, '');
    const actualType = id.startsWith('tv-') ? 'tv' : id.startsWith('m-') ? 'movie' : type;

    if (id.startsWith('tt')) {
      const findRes = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`);
      const results = actualType === 'movie' ? findRes.movie_results : findRes.tv_results;
      if (results.length === 0) return [];
      tmdbId = String(results[0].id);
    }

    const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(
      `/${actualType}/${tmdbId}/similar?page=${page}`,
      tmdbLang
    );
    return data.results.map(item => mapTmdbItemToMovieData(item, actualType));
  } catch {
    return [];
  }
}

export async function getNowPlaying(lang = 'en', page = 1): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(`/movie/now_playing?page=${page}`, tmdbLang);
    return data.results.map(r => mapTmdbItemToMovieData({ ...r, media_type: 'movie' }, 'movie'));
  } catch {
    return [];
  }
}

export async function getPopular(lang = 'en', page = 1): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<{ results: TmdbSearchItem[] }>(`/movie/popular?page=${page}`, tmdbLang),
      tmdbFetch<{ results: TmdbSearchItem[] }>(`/tv/popular?page=${page}`, tmdbLang),
    ]);
    return [
      ...movieData.results.map(r => mapTmdbItemToMovieData({ ...r, media_type: 'movie' }, 'movie')),
      ...tvData.results.map(r => mapTmdbItemToMovieData({ ...r, media_type: 'tv' }, 'tv')),
    ];
  } catch {
    return [];
  }
}

export async function getDirectorMovies(directorName: string, lang = 'en'): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    const searchRes = await tmdbFetch<{
      results: Array<{ id: number; name: string; known_for_department: string }>;
    }>(`/search/person?query=${encodeURIComponent(directorName)}&include_adult=false`);

    // Prefer someone in Directing; otherwise take first result
    const person =
      searchRes.results.find(p => p.known_for_department === 'Directing') ??
      searchRes.results[0];

    if (!person) return [];

    const credits = await tmdbFetch<{
      crew: Array<{
        id: number;
        title: string;
        release_date: string;
        poster_path: string | null;
        vote_average: number;
        overview: string;
        genre_ids?: number[];
        original_language: string;
        job: string;
      }>;
    }>(`/person/${person.id}/movie_credits`, tmdbLang);

    return credits.crew
      .filter(c => c.job === 'Director')
      .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
      .map(c =>
        mapTmdbItemToMovieData(
          {
            id: c.id,
            media_type: 'movie',
            title: c.title,
            release_date: c.release_date,
            poster_path: c.poster_path,
            vote_average: c.vote_average,
            overview: c.overview,
            genre_ids: c.genre_ids,
            original_language: c.original_language,
          },
          'movie'
        )
      );
  } catch {
    return [];
  }
}

export async function discoverMovies(options: {
  genre?: number | string | null;
  without_genres?: string;
  year?: string;
  country?: string;
  without_country?: string;
  language?: string;
  without_language?: string;
  vote_average_gte?: number;
  vote_count_gte?: number;
  vote_count_lte?: number;
  page?: number;
  lang?: string;
  sort_by?: string;
}): Promise<SearchResult & { totalPages?: number }> {
  if (!API_KEY) return { Response: 'False', Error: 'VITE_TMDB_API_KEY is not configured' };
  const {
    genre,
    without_genres,
    year,
    country,
    without_country,
    language,
    without_language,
    vote_average_gte,
    vote_count_gte,
    vote_count_lte,
    page = 1,
    lang = 'en',
    sort_by = 'popularity.desc'
  } = options;
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';

  try {
    const commonParams = `&page=${page}&include_adult=false&sort_by=${sort_by}`;
    const genreParam = genre ? `&with_genres=${genre}` : '';
    const withoutGenreParam = without_genres ? `&without_genres=${without_genres}` : '';
    const countryParam = country && country !== 'all' ? `&with_origin_country=${country}` : '';
    const withoutCountryParam = without_country ? `&without_origin_country=${without_country}` : '';
    const langParam = language && language !== 'all' ? `&with_original_language=${language}` : '';
    const withoutLangParam = without_language ? `&without_original_language=${without_language}` : '';
    const voteAvgGteParam = vote_average_gte !== undefined ? `&vote_average.gte=${vote_average_gte}` : '';
    const voteCountGteParam = vote_count_gte !== undefined ? `&vote_count.gte=${vote_count_gte}` : '';
    const voteCountLteParam = vote_count_lte !== undefined ? `&vote_count.lte=${vote_count_lte}` : '';
    const ratingParams = `${voteAvgGteParam}${voteCountGteParam}${voteCountLteParam}`;

    const yearQuery = year && year !== 'all' ? `&primary_release_year=${year}` : '';
    const tvYearQuery = year && year !== 'all' ? `&first_air_date_year=${year}` : '';

    const movieUrl = `/discover/movie?${commonParams}${genreParam}${withoutGenreParam}${countryParam}${withoutCountryParam}${langParam}${withoutLangParam}${yearQuery}${ratingParams}`;
    const tvUrl = `/discover/tv?${commonParams}${genreParam}${withoutGenreParam}${countryParam}${withoutCountryParam}${langParam}${withoutLangParam}${tvYearQuery}${ratingParams}`;

    const [movieData, tvData] = await Promise.all([
      tmdbFetch<{ results: TmdbSearchItem[]; total_results: number; total_pages: number }>(movieUrl, tmdbLang),
      tmdbFetch<{ results: TmdbSearchItem[]; total_results: number; total_pages: number }>(tvUrl, tmdbLang)
    ]);

    const allResults = [
      ...movieData.results.map(r => ({ ...r, media_type: 'movie' as const })),
      ...tvData.results.map(r => ({ ...r, media_type: 'tv' as const }))
    ].sort((a, b) => b.vote_average - a.vote_average);

    const movies: MovieData[] = allResults.map(r => mapTmdbItemToMovieData(r, r.media_type));

    for (const movie of movies) {
      const existing = await getCachedMovie(movie.imdbID);
      if (!existing) await cacheMovie({ ...movie, _lang: lang });
    }

    return {
      Response: 'True',
      Search: movies,
      totalResults: String(movieData.total_results + tvData.total_results),
      totalPages: Math.max(movieData.total_pages, tvData.total_pages)
    };
  } catch (err) {
    return { Response: 'False', Error: String(err) };
  }
}
