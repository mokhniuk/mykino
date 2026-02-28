import { getContentPreferences, getWatched, getWatchlist, getFavourites, getSetting, setSetting, type MovieData } from './db';
import { discoverMovies, getRecommendations, getTrending, getNowPlaying, getPopular, getSimilar } from './api';
import { getOrBuildTasteProfile, invalidateTasteProfile, type TasteProfile } from './tasteProfile';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
export const FETCH_PAGES = 5;       // pages fetched per source on first build
const LOAD_MORE_PAGES = 3;          // pages fetched per infinite-scroll batch

/** Fetches FETCH_PAGES pages in parallel, tolerating individual page failures. */
async function fetchPages(fetcher: (page: number) => Promise<MovieData[]>): Promise<MovieData[]> {
  const results = await Promise.allSettled(
    Array.from({ length: FETCH_PAGES }, (_, i) => fetcher(i + 1))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

export interface RecoSection {
  id: 'becauseLiked' | 'byGenre' | 'nowPlaying' | 'trending' | 'popular' | 'hiddenGems';
  seedTitle?: string; // for "Because you liked X"
  movies: MovieData[];
}

export const SECTION_SLUGS: Record<RecoSection['id'], string> = {
  becauseLiked: 'because-liked',
  byGenre:      'by-genre',
  nowPlaying:   'now-playing',
  trending:     'trending',
  popular:      'popular',
  hiddenGems:   'hidden-gems',
};

export const SLUG_TO_SECTION_ID: Record<string, RecoSection['id']> = Object.fromEntries(
  (Object.entries(SECTION_SLUGS) as [RecoSection['id'], string][]).map(([id, slug]) => [slug, id])
);

interface CachedSections {
  sections: RecoSection[];
  cachedAt: number;
}

async function getSectionCache(lang: string): Promise<RecoSection[] | null> {
  const raw = await getSetting(`reco_sections_${lang}`);
  if (!raw) return null;
  try {
    const { sections, cachedAt } = JSON.parse(raw) as CachedSections;
    if (Date.now() - cachedAt > CACHE_TTL) return null;
    return sections;
  } catch {
    return null;
  }
}

async function setSectionCache(lang: string, sections: RecoSection[]): Promise<void> {
  await setSetting(`reco_sections_${lang}`, JSON.stringify({ sections, cachedAt: Date.now() }));
}

export async function clearRecommendationsCache(lang?: string): Promise<void> {
  if (lang) {
    await setSetting(`reco_sections_${lang}`, '');
  } else {
    await Promise.all(['en', 'ua', 'de'].map(l => setSetting(`reco_sections_${l}`, '')));
  }
  await invalidateTasteProfile();
}

async function getDailySeed(favourites: MovieData[]): Promise<MovieData | null> {
  if (favourites.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [savedDate, savedId] = await Promise.all([
    getSetting('daily_seed_date'),
    getSetting('daily_seed_id'),
  ]);

  if (savedDate === today && savedId) {
    const existing = favourites.find(f => f.imdbID === savedId);
    if (existing) return existing;
  }

  // Pool: 3 most-recently-added + 2 highest-rated favourites
  const byRecent = [...favourites]
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .slice(0, 3);
  const byRating = [...favourites]
    .sort((a, b) => parseFloat(b.imdbRating ?? '0') - parseFloat(a.imdbRating ?? '0'))
    .slice(0, 2);

  const poolMap = new Map<string, MovieData>();
  for (const m of [...byRecent, ...byRating]) poolMap.set(m.imdbID, m);
  const pool = Array.from(poolMap.values());

  // Deterministic pick based on today's date
  const dateHash = Array.from(today).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = pool[dateHash % pool.length];

  await Promise.all([
    setSetting('daily_seed_date', today),
    setSetting('daily_seed_id', seed.imdbID),
  ]);

  return seed;
}

function scoreMovie(movie: MovieData, profile: TasteProfile): number {
  let score = 0;

  const [topGenre, ...otherGenres] = profile.topGenres;
  if (topGenre !== undefined && movie.genre_ids?.includes(topGenre)) score += 5;
  if (otherGenres.length > 0 && movie.genre_ids?.some(id => otherGenres.includes(id))) score += 3;

  const [topLang, ...otherLangs] = profile.topLanguages;
  if (topLang && movie.original_language === topLang) score += 3;
  if (otherLangs.length > 0 && otherLangs.includes(movie.original_language ?? '')) score += 1;

  if (profile.topCountries.length > 0 && movie.origin_country?.some(c => profile.topCountries.includes(c))) score += 2;

  const [topDecade] = profile.topDecades;
  if (topDecade) {
    const year = parseInt(movie.Year, 10);
    if (!isNaN(year)) {
      const movieDecade = `${Math.floor(year / 10) * 10}s`;
      if (movieDecade === topDecade) score += 2;
    }
  }

  const rating = parseFloat(movie.imdbRating ?? '0');
  if (rating >= 7.0) score += 2;
  else if (rating >= 6.0) score += 1;

  return score;
}

function dedupeByImdbID(movies: MovieData[]): MovieData[] {
  return Array.from(new Map(movies.map(m => [m.imdbID, m])).values());
}

function filterAndScore(
  movies: MovieData[],
  excludeIds: Set<string>,
  dislikedGenres: Set<number>,
  dislikedCountries: Set<string>,
  dislikedLanguages: Set<string>,
  profile: TasteProfile,
  limit = 100,
): MovieData[] {
  return movies
    .filter(m => {
      if (excludeIds.has(m.imdbID)) return false;
      if (m.genre_ids?.some(id => dislikedGenres.has(id))) return false;
      if (m.origin_country?.some(c => dislikedCountries.has(c))) return false;
      if (m.original_language && dislikedLanguages.has(m.original_language)) return false;
      return true;
    })
    .map(m => ({ movie: m, score: scoreMovie(m, profile) }))
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie)
    .slice(0, limit);
}

export async function getHomeSections(lang = 'en'): Promise<RecoSection[]> {
  const cached = await getSectionCache(lang);
  if (cached) return cached;

  const [prefs, watched, watchlist, favourites] = await Promise.all([
    getContentPreferences(),
    getWatched(),
    getWatchlist(),
    getFavourites(),
  ]);

  const excludeIds = new Set([
    ...watched.map(m => m.imdbID),
    ...watchlist.map(m => m.imdbID),
  ]);

  const dislikedGenres = new Set(prefs.disliked_genres);
  const dislikedCountries = new Set(prefs.disliked_countries);
  const dislikedLanguages = new Set(prefs.disliked_languages);

  const [profile, dailySeed] = await Promise.all([
    getOrBuildTasteProfile(),
    getDailySeed(favourites),
  ]);

  // Top genres: from profile, fall back to content preferences
  const topGenres = profile.topGenres.length > 0 ? profile.topGenres : prefs.liked_genres;

  const seedId = dailySeed?.imdbID;
  const seedType = dailySeed?.Type === 'series' ? 'tv' : 'movie';

  // Parallel fetch all sources — 5 pages each for rich results
  const [
    seedRecs,
    seedSimilar,
    genreDiscover,
    nowPlayingMovies,
    trendingMovies,
    popularMovies,
    hiddenGemsMovies,
  ] = await Promise.all([
    seedId
      ? fetchPages(p => getRecommendations(seedId, seedType, lang, p))
      : Promise.resolve([]),
    seedId
      ? fetchPages(p => getSimilar(seedId, seedType, lang, p))
      : Promise.resolve([]),
    topGenres.length > 0
      ? fetchPages(p => discoverMovies({
          genre: topGenres.slice(0, 3).join('|'),
          vote_average_gte: 6.5,
          vote_count_gte: 200,
          sort_by: 'popularity.desc',
          lang,
          page: p,
        }).then(r => r.Search ?? []))
      : Promise.resolve([]),
    fetchPages(p => getNowPlaying(lang, p)),
    fetchPages(p => getTrending(lang, p)),
    fetchPages(p => getPopular(lang, p)),
    fetchPages(p => discoverMovies({
      vote_average_gte: 7.5,
      vote_count_gte: 100,
      vote_count_lte: 5000,
      sort_by: 'vote_average.desc',
      lang,
      page: p,
    }).then(r => r.Search ?? [])),
  ]);

  const filter = (movies: MovieData[], limit = 100) =>
    filterAndScore(
      dedupeByImdbID(movies),
      excludeIds,
      dislikedGenres,
      dislikedCountries,
      dislikedLanguages,
      profile,
      limit,
    );

  const sections: RecoSection[] = [];

  // "Because you liked X"
  if (dailySeed && (seedRecs.length > 0 || seedSimilar.length > 0)) {
    const combined = dedupeByImdbID([...seedRecs, ...seedSimilar]);
    const filtered = filter(combined);
    if (filtered.length > 0) {
      sections.push({ id: 'becauseLiked', seedTitle: dailySeed.Title, movies: filtered });
    }
  }

  // "By Genre"
  if (topGenres.length > 0) {
    const filtered = filter(genreDiscover);
    if (filtered.length > 0) {
      sections.push({ id: 'byGenre', movies: filtered });
    }
  }

  // "Now Playing"
  const nowPlayingFiltered = filter(nowPlayingMovies);
  if (nowPlayingFiltered.length > 0) {
    sections.push({ id: 'nowPlaying', movies: nowPlayingFiltered });
  }

  // "Trending"
  const trendingFiltered = filter(trendingMovies);
  if (trendingFiltered.length > 0) {
    sections.push({ id: 'trending', movies: trendingFiltered });
  }

  // "Popular"
  const popularFiltered = filter(popularMovies);
  if (popularFiltered.length > 0) {
    sections.push({ id: 'popular', movies: popularFiltered });
  }

  // "Hidden Gems"
  const hiddenGemsFiltered = filter(hiddenGemsMovies);
  if (hiddenGemsFiltered.length > 0) {
    sections.push({ id: 'hiddenGems', movies: hiddenGemsFiltered });
  }

  await setSectionCache(lang, sections);
  return sections;
}

/**
 * Fetches the next batch of movies for a section page (infinite scroll).
 * `nextPage` is the first TMDB page to request; returns the updated nextPage.
 * `alreadyShownIds` prevents duplicates across batches.
 */
export async function loadMoreForSection(
  sectionId: RecoSection['id'],
  lang: string,
  nextPage: number,
  alreadyShownIds: Set<string>,
): Promise<{ movies: MovieData[]; nextPage: number }> {
  const [prefs, watched, watchlist, profile] = await Promise.all([
    getContentPreferences(),
    getWatched(),
    getWatchlist(),
    getOrBuildTasteProfile(),
  ]);

  const excludeIds = new Set([
    ...watched.map(m => m.imdbID),
    ...watchlist.map(m => m.imdbID),
    ...alreadyShownIds,
  ]);

  const dislikedGenres = new Set(prefs.disliked_genres);
  const dislikedCountries = new Set(prefs.disliked_countries);
  const dislikedLanguages = new Set(prefs.disliked_languages);
  const topGenres = profile.topGenres.length > 0 ? profile.topGenres : prefs.liked_genres;

  const pageNums = Array.from({ length: LOAD_MORE_PAGES }, (_, i) => nextPage + i);

  let rawMovies: MovieData[] = [];

  switch (sectionId) {
    case 'becauseLiked': {
      const [savedDate, savedId] = await Promise.all([
        getSetting('daily_seed_date'),
        getSetting('daily_seed_id'),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      if (savedDate === today && savedId) {
        const seedType: 'movie' | 'tv' = savedId.startsWith('tv-') ? 'tv' : 'movie';
        const batches = await Promise.allSettled(
          pageNums.flatMap(p => [
            getRecommendations(savedId, seedType, lang, p),
            getSimilar(savedId, seedType, lang, p),
          ])
        );
        rawMovies = batches
          .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
          .flatMap(r => r.value);
      }
      break;
    }
    case 'byGenre': {
      if (topGenres.length > 0) {
        const batches = await Promise.allSettled(
          pageNums.map(p => discoverMovies({
            genre: topGenres.slice(0, 3).join('|'),
            vote_average_gte: 6.5,
            vote_count_gte: 200,
            sort_by: 'popularity.desc',
            lang,
            page: p,
          }).then(r => r.Search ?? []))
        );
        rawMovies = batches
          .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
          .flatMap(r => r.value);
      }
      break;
    }
    case 'nowPlaying': {
      const batches = await Promise.allSettled(pageNums.map(p => getNowPlaying(lang, p)));
      rawMovies = batches
        .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
      break;
    }
    case 'trending': {
      const batches = await Promise.allSettled(pageNums.map(p => getTrending(lang, p)));
      rawMovies = batches
        .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
      break;
    }
    case 'popular': {
      const batches = await Promise.allSettled(pageNums.map(p => getPopular(lang, p)));
      rawMovies = batches
        .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
      break;
    }
    case 'hiddenGems': {
      const batches = await Promise.allSettled(
        pageNums.map(p => discoverMovies({
          vote_average_gte: 7.5,
          vote_count_gte: 100,
          vote_count_lte: 5000,
          sort_by: 'vote_average.desc',
          lang,
          page: p,
        }).then(r => r.Search ?? []))
      );
      rawMovies = batches
        .filter((r): r is PromiseFulfilledResult<MovieData[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
      break;
    }
  }

  const movies = filterAndScore(
    dedupeByImdbID(rawMovies),
    excludeIds,
    dislikedGenres,
    dislikedCountries,
    dislikedLanguages,
    profile,
  );

  return { movies, nextPage: nextPage + LOAD_MORE_PAGES };
}
