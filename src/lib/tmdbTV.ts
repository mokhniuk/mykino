import { getSetting, setSetting } from './db';
import type { TVSeasonMeta, TVEpisode } from './tvTracking';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const STILL_BASE = 'https://image.tmdb.org/t/p/w300';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

const TMDB_LANG: Record<string, string> = {
  en: 'en-US',
  ua: 'uk-UA',
  de: 'de-DE',
};

// v2 cache keys — invalidates old sparse caches
const TTL_SHOW = 24 * 60 * 60 * 1000;
const TTL_SEASON = 7 * 24 * 60 * 60 * 1000;

export interface TVShowDetail {
  id: string;
  title: string;
  year: string;
  poster: string | null;
  overview: string;
  rating: string;
  voteCount?: string;
  genres: string;
  showStatus: string;
  creator?: string;
  cast?: string;
  language?: string;
  country?: string;
  trailerKey?: string;
  seasons: TVSeasonMeta[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
}

export interface TVSeasonDetail {
  season_number: number;
  name: string;
  episodes: TVEpisode[];
}

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
}

interface TmdbTVFull {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  spoken_languages: { english_name: string }[];
  production_countries: { name: string }[];
  seasons: { season_number: number; name: string; episode_count: number }[];
  credits: {
    cast: { name: string; order: number }[];
    crew: { job: string; name: string }[];
  };
  videos?: { results: TmdbVideo[] };
}

interface TmdbSeasonFull {
  season_number: number;
  name: string;
  episodes: {
    episode_number: number;
    name: string;
    air_date: string;
    overview: string;
    runtime: number | null;
    still_path: string | null;
  }[];
}

async function tmdbFetch<T>(path: string, lang?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const langParam = lang ? `&language=${lang}` : '';
  const res = await fetch(`${BASE_URL}${path}${sep}api_key=${API_KEY}${langParam}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

function getBestTrailer(videos?: { results: TmdbVideo[] }): string | undefined {
  if (!videos?.results) return undefined;
  const trailers = videos.results.filter(v => v.type === 'Trailer' && v.site === 'YouTube');
  if (trailers.length > 0) return trailers[0].key;
  return videos.results.find(v => v.site === 'YouTube')?.key;
}

export async function getTVShowDetails(id: string, lang = 'en'): Promise<TVShowDetail | null> {
  if (!API_KEY) return null;
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  const cacheKey = `tv_show2_${id}_${lang}`;

  const cached = await getSetting(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: TVShowDetail; ts: number };
      if (Date.now() - ts < TTL_SHOW) return data;
    } catch { /* ignore */ }
  }

  try {
    const rawId = id.replace(/^tv-/, '');
    const detail = await tmdbFetch<TmdbTVFull>(
      `/tv/${rawId}?append_to_response=credits,videos`,
      tmdbLang,
    );

    let trailerKey = getBestTrailer(detail.videos);

    // Fallback: fetch English videos if no trailer found in localized response
    if (!trailerKey && lang !== 'en') {
      try {
        const enDetail = await tmdbFetch<{ videos: { results: TmdbVideo[] } }>(
          `/tv/${rawId}?append_to_response=videos`,
          'en-US',
        );
        trailerKey = getBestTrailer(enDetail.videos);
      } catch { /* ignore */ }
    }

    const creator = detail.credits?.crew
      .filter(c => c.job === 'Creator')
      .map(c => c.name)
      .join(', ') || undefined;

    const cast = detail.credits?.cast
      .slice(0, 5)
      .map(c => c.name)
      .join(', ') || undefined;

    const result: TVShowDetail = {
      id,
      title: detail.name,
      year: detail.first_air_date?.slice(0, 4) ?? '',
      poster: detail.poster_path ? `${IMAGE_BASE}${detail.poster_path}` : null,
      overview: detail.overview,
      rating: detail.vote_average ? detail.vote_average.toFixed(1) : '',
      voteCount: detail.vote_count ? String(detail.vote_count) : undefined,
      genres: detail.genres?.map(g => g.name).join(', ') ?? '',
      showStatus: detail.status,
      creator,
      cast,
      language: detail.spoken_languages?.map(l => l.english_name).join(', ') || undefined,
      country: detail.production_countries?.map(c => c.name).join(', ') || undefined,
      trailerKey,
      seasons: detail.seasons.map(s => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
      })),
      numberOfSeasons: detail.number_of_seasons,
      numberOfEpisodes: detail.number_of_episodes,
    };

    await setSetting(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
    return result;
  } catch {
    return null;
  }
}

export async function getTVSeasonDetail(
  tvId: string,
  seasonNum: number,
  lang = 'en',
): Promise<TVSeasonDetail | null> {
  if (!API_KEY) return null;
  const tmdbLang = TMDB_LANG[lang] ?? 'en-US';
  const cacheKey = `tv_season2_${tvId}_${seasonNum}_${lang}`;

  const cached = await getSetting(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: TVSeasonDetail; ts: number };
      if (Date.now() - ts < TTL_SEASON) return data;
    } catch { /* ignore */ }
  }

  try {
    const rawId = tvId.replace(/^tv-/, '');
    const detail = await tmdbFetch<TmdbSeasonFull>(
      `/tv/${rawId}/season/${seasonNum}`,
      tmdbLang,
    );

    const result: TVSeasonDetail = {
      season_number: detail.season_number,
      name: detail.name,
      episodes: (detail.episodes ?? []).map(e => ({
        episode_number: e.episode_number,
        name: e.name,
        air_date: e.air_date,
        overview: e.overview || undefined,
        runtime: e.runtime ?? undefined,
        still_path: e.still_path,
      })),
    };

    await setSetting(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
    return result;
  } catch {
    return null;
  }
}
