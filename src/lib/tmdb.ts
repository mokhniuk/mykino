import { cacheMovie, getCachedMovie, type MovieData } from './db';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

/** Maps app language codes to TMDB locale strings */
const TMDB_LANG: Record<string, string> = {
  en: 'en-US',
  ua: 'uk-UA',
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
}

interface TmdbGenre { id: number; name: string; }
interface TmdbCastMember { name: string; order: number; }
interface TmdbCrewMember { job: string; department: string; name: string; }
interface TmdbCredits { cast: TmdbCastMember[]; crew: TmdbCrewMember[]; }

interface TmdbMovieDetail {
  id: number;
  title: string;
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
}

interface TmdbTVDetail {
  id: number;
  name: string;
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
}

interface TmdbFindResult {
  movie_results: Array<{ id: number }>;
  tv_results: Array<{ id: number }>;
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

function mapMovieDetail(data: TmdbMovieDetail, storeId: string): MovieData {
  const { director, writer, actors } = mapCredits(data.credits);
  return {
    imdbID: storeId,
    Title: data.title,
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
  if (cached?.Plot !== undefined && (cached as Record<string, unknown>)._lang === lang) {
    return cached;
  }

  if (!API_KEY) return cached ?? null;

  try {
    if (id.startsWith('tt')) {
      // IMDb ID → resolve via TMDB /find endpoint, keep original id as the cache key
      const found = await tmdbFetch<TmdbFindResult>(`/find/${id}?external_source=imdb_id`, tmdbLang);

      if (found.movie_results.length > 0) {
        const tmdbId = String(found.movie_results[0].id);
        const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}?append_to_response=credits`, tmdbLang);
        const movie = mapMovieDetail(detail, id);
        await cacheMovie({ ...movie, _lang: lang });
        return movie;
      }
      if (found.tv_results.length > 0) {
        const tmdbId = String(found.tv_results[0].id);
        const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${tmdbId}?append_to_response=credits`, tmdbLang);
        const movie = mapTVDetail(detail, id);
        await cacheMovie({ ...movie, _lang: lang });
        return movie;
      }
      return cached ?? null;
    }

    // TMDB numeric ID — use Type from cache to pick the right endpoint
    if (cached?.Type === 'series') {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=credits`, tmdbLang);
      const movie = mapTVDetail(detail, id);
      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    }

    // Default: try movie, fall back to TV
    try {
      const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}?append_to_response=credits`, tmdbLang);
      const movie = mapMovieDetail(detail, id);
      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    } catch {
      const detail = await tmdbFetch<TmdbTVDetail>(`/tv/${id}?append_to_response=credits`, tmdbLang);
      const movie = mapTVDetail(detail, id);
      await cacheMovie({ ...movie, _lang: lang });
      return movie;
    }
  } catch {
    return cached ?? null;
  }
}
