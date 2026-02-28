import { cacheMovie, getCachedMovie, type MovieData } from './db';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const PROVIDER_LOGO_BASE = 'https://image.tmdb.org/t/p/w45';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

/** Maps app language codes to TMDB locale strings */
const TMDB_LANG: Record<string, string> = {
  en: 'en-US',
  ua: 'uk-UA',
  de: 'de-DE',
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
}

interface TmdbGenre { id: number; name: string; }
interface TmdbCastMember { name: string; order: number; }
interface TmdbCrewMember { job: string; department: string; name: string; }
interface TmdbCredits { cast: TmdbCastMember[]; crew: TmdbCrewMember[]; }

interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  spoken_languages: { english_name: string }[];
  production_countries: { name: string }[];
  revenue: number;
  credits: TmdbCredits;
  videos?: { results: TmdbVideo[] };
}

interface TmdbTVDetail {
  id: number;
  name: string;
  original_name: string;
  first_air_date: string;
  poster_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  spoken_languages: { english_name: string }[];
  production_countries: { name: string }[];
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
  return {
    imdbID: storeId,
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
  };
}

function mapTVDetail(data: TmdbTVDetail, storeId: string): MovieData {
  const { writer, actors } = mapCredits(data.credits);
  const creator = data.credits?.crew
    .filter(c => c.job === 'Creator')
    .map(c => c.name)
    .join(', ') || undefined;
  const runtime = data.episode_run_time?.[0];
  return {
    imdbID: storeId,
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
  };
}

function mapTmdbItemToMovieData(item: TmdbSearchItem, type: 'movie' | 'tv' | 'series' = 'movie'): MovieData {
  const isTV = type === 'tv' || type === 'series' || item.media_type === 'tv';
  return {
    imdbID: String(item.id),
    Title: isTV ? (item.name ?? '') : (item.title ?? ''),
    Year: (isTV ? item.first_air_date : item.release_date)?.slice(0, 4) ?? '',
    Poster: posterUrl(item.poster_path),
    Type: isTV ? 'series' : 'movie',
    imdbRating: item.vote_average ? item.vote_average.toFixed(1) : undefined,
    Plot: item.overview || undefined,
    genre_ids: item.genre_ids,
    origin_country: item.origin_country,
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
    const data = await tmdbFetch<{ results: TmdbSearchItem[]; total_results: number }>(
      `/search/multi?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
      tmdbLang
    );

    const movies: MovieData[] = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .map(r => {
        const isTV = r.media_type === 'tv';
        return {
          imdbID: String(r.id),
          Title: isTV ? (r.name ?? '') : (r.title ?? ''),
          Year: (isTV ? r.first_air_date : r.release_date)?.slice(0, 4) ?? '',
          Poster: posterUrl(r.poster_path),
          Type: isTV ? 'series' : 'movie',
          imdbRating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
          Plot: r.overview || undefined,
          genre_ids: r.genre_ids,
          origin_country: r.origin_country,
        };
      });

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

  // Return cached only if full details are present AND language matches
  if (cached?.Plot !== undefined && (cached as Record<string, unknown>)._full === true && (cached as Record<string, unknown>)._lang === lang) {
    return cached;
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

    // TMDB numeric ID — use Type from cache to pick the right endpoint
    if (cached?.Type === 'series') {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapTVDetail(detail, id);
      movie._full = true;

      // Fallback for series trailers
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=videos`, 'en-US');
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
      const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapMovieDetail(detail, id);
      movie._full = true;

      // Fallback for trailers: if localized trailer is missing, try fetching original (English)
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}?append_to_response=videos`, 'en-US');
          const originalTrailer = getBestTrailer(originalDetail.videos);
          if (originalTrailer) {
            movie = { ...movie, TrailerKey: originalTrailer };
          }
        } catch { /* ignore fallback error */ }
      }

      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    } catch {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=credits,videos`, tmdbLang);
      let movie = mapTVDetail(detail, id);
      movie._full = true;

      // Fallback for series trailers
      if (!movie.TrailerKey && lang !== 'en') {
        try {
          const originalDetail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=videos`, 'en-US');
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
    let tmdbId = id;
    let mediaType = type === 'series' ? 'tv' : 'movie';

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

export async function getRecommendations(id: string, type: 'movie' | 'tv' = 'movie', lang = 'en'): Promise<MovieData[]> {
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  try {
    // We need to find the TMDB ID first if we only have imdbID
    let tmdbId = id;
    if (id.startsWith('tt')) {
      const findRes = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`);
      const results = type === 'movie' ? findRes.movie_results : findRes.tv_results;
      if (results.length === 0) return [];
      tmdbId = String(results[0].id);
    }

    const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(
      `/${type}/${tmdbId}/recommendations`,
      tmdbLang
    );
    return data.results.map(item => mapTmdbItemToMovieData(item, type));
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

    const yearQuery = year && year !== 'all' ? `&primary_release_year=${year}` : '';
    const tvYearQuery = year && year !== 'all' ? `&first_air_date_year=${year}` : '';

    const movieUrl = `/discover/movie?${commonParams}${genreParam}${withoutGenreParam}${countryParam}${withoutCountryParam}${langParam}${withoutLangParam}${yearQuery}`;
    const tvUrl = `/discover/tv?${commonParams}${genreParam}${withoutGenreParam}${countryParam}${withoutCountryParam}${langParam}${withoutLangParam}${tvYearQuery}`;

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
