import { getSetting, setSetting, getFavourites, getWatched, type MovieData } from './db';

const TASTE_PROFILE_KEY = 'taste_profile';
const TASTE_PROFILE_TTL = 24 * 60 * 60 * 1000; // 24h

export interface TasteProfile {
  topGenres: number[];    // top 5 genre IDs by weighted frequency
  topLanguages: string[]; // top 3 ISO 639-1 codes
  topCountries: string[]; // top 3 ISO 3166-1 codes
  topDecades: string[];   // top 2 e.g. ["1990s", "2000s"]
  builtAt: number;
}

function getDecade(year: string): string | null {
  const y = parseInt(year, 10);
  if (isNaN(y)) return null;
  return `${Math.floor(y / 10) * 10}s`;
}

function topN<T extends string | number>(scores: Map<T, number>, n: number): T[] {
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export async function buildTasteProfile(): Promise<TasteProfile> {
  const [favourites, watched] = await Promise.all([getFavourites(), getWatched()]);

  const genreScores = new Map<number, number>();
  const languageScores = new Map<string, number>();
  const countryScores = new Map<string, number>();
  const decadeScores = new Map<string, number>();

  function tally(movie: MovieData, weight: number) {
    for (const id of movie.genre_ids ?? []) {
      genreScores.set(id, (genreScores.get(id) ?? 0) + weight);
    }
    if (movie.original_language) {
      languageScores.set(
        movie.original_language,
        (languageScores.get(movie.original_language) ?? 0) + weight
      );
    }
    for (const c of movie.origin_country ?? []) {
      countryScores.set(c, (countryScores.get(c) ?? 0) + weight);
    }
    const decade = getDecade(movie.Year);
    if (decade) {
      decadeScores.set(decade, (decadeScores.get(decade) ?? 0) + weight);
    }
  }

  // Favourites count most (×3)
  for (const m of favourites) tally(m, 3);

  // First 100 watched get ×2, rest get ×1
  const top100Watched = watched.slice(0, 100);
  const remainingWatched = watched.slice(100);
  for (const m of top100Watched) tally(m, 2);
  for (const m of remainingWatched) tally(m, 1);

  return {
    topGenres: topN(genreScores, 5),
    topLanguages: topN(languageScores, 3),
    topCountries: topN(countryScores, 3),
    topDecades: topN(decadeScores, 2),
    builtAt: Date.now(),
  };
}

export async function getTasteProfile(): Promise<TasteProfile | null> {
  const raw = await getSetting(TASTE_PROFILE_KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as TasteProfile;
    if (Date.now() - profile.builtAt > TASTE_PROFILE_TTL) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function getOrBuildTasteProfile(): Promise<TasteProfile> {
  const cached = await getTasteProfile();
  if (cached) return cached;
  const profile = await buildTasteProfile();
  await setSetting(TASTE_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function invalidateTasteProfile(): Promise<void> {
  await setSetting(TASTE_PROFILE_KEY, '');
}
