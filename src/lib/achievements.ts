import { getSetting, setSetting, type MovieData } from './db';
import { TOP_100_MOVIES, type TopMovie } from './top100';

// ─── Daily Top 100 Pick ───────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function dateHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h += dateStr.charCodeAt(i);
  return h;
}

export async function getDailyTop100Pick(unwatched: TopMovie[]): Promise<string | null> {
  if (unwatched.length === 0) return null;

  const today = todayString();
  const savedDate = await getSetting('daily_top100_date');
  const savedId = await getSetting('daily_top100_id');

  // If we have a valid pick for today that is still in the unwatched pool, reuse it
  if (savedDate === today && savedId && unwatched.find(m => m.imdbID === savedId)) {
    return savedId;
  }

  // Pick deterministically by date hash
  const h = dateHash(today);
  const pick = unwatched[h % unwatched.length];

  await setSetting('daily_top100_date', today);
  await setSetting('daily_top100_id', pick.imdbID);

  return pick.imdbID;
}

// ─── Top 100 Progress ─────────────────────────────────────────────────────────

export function computeTop100Progress(watched: MovieData[]): number {
  if (!Array.isArray(watched)) return 0;
  const watchedIds = new Set(watched.map(m => m.imdbID));
  const watchedTitles = new Set([
    ...watched.map(m => (m.Title || '').toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]);
  return TOP_100_MOVIES.filter(
    m => watchedIds.has(m.imdbID) || (m.Title && watchedTitles.has(m.Title.toLowerCase()))
  ).length;
}

export function computeUnwatchedTop100(watched: MovieData[]): TopMovie[] {
  if (!Array.isArray(watched)) return TOP_100_MOVIES;
  const watchedIds = new Set(watched.map(m => m.imdbID));
  const watchedTitles = new Set([
    ...watched.map(m => (m.Title || '').toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]);
  return TOP_100_MOVIES.filter(
    m => !watchedIds.has(m.imdbID) && !(m.Title && watchedTitles.has(m.Title.toLowerCase()))
  );
}

// ─── Director Completions ─────────────────────────────────────────────────────

export interface DirectorCompletion {
  name: string;
  slug: string;
  movies: MovieData[];
}

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie',
  'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'i', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '',
  'ю': 'iu', 'я': 'ia', 'ё': 'io', 'ъ': '', 'ы': 'y', 'э': 'e',
};

export function slugifyDirector(name: string): string {
  const transliterated = name
    .toLowerCase()
    .split('')
    .map(c => CYRILLIC_MAP[c] ?? c)
    .join('');
  return transliterated
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function computeDirectorCompletions(watched: MovieData[]): DirectorCompletion[] {
  if (!Array.isArray(watched)) return [];
  const byDirector = new Map<string, MovieData[]>();

  for (const movie of watched) {
    if (!movie.Director || movie.Director === 'N/A') continue;
    // Split co-directors and give credit to each
    const names = movie.Director.split(',').map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      const existing = byDirector.get(name) ?? [];
      existing.push(movie);
      byDirector.set(name, existing);
    }
  }

  const results: DirectorCompletion[] = [];
  for (const [name, movies] of byDirector) {
    if (movies.length >= 2) {
      results.push({ name, slug: slugifyDirector(name), movies });
    }
  }

  // Sort by count descending, then alphabetically
  results.sort((a, b) => b.movies.length - a.movies.length || a.name.localeCompare(b.name));
  return results;
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export const MILESTONE_IDS = [
  'first_film',
  'ten_films',
  'twenty_five_films',
  'fifty_films',
  'hundred_films',
  'two_hundred_films',
  'top_contender',
  'classic',
  'time_traveller',
  'world_explorer',
  'polyglot',
  'genre_master',
  'decade_hopper',
  'director_devotee',
  'binge_day',
  'epic_viewer',
  'quick_pick',
] as const;

export type MilestoneId = typeof MILESTONE_IDS[number];

export function computeMilestones(watched: MovieData[]): Milestone[] {
  if (!Array.isArray(watched)) return MILESTONE_IDS.map(id => ({ id, unlocked: false }));
  const count = watched.length;

  const countries = new Set<string>();
  const languages = new Set<string>();
  const genres = new Set<string>();
  const decades = new Set<number>();
  const directorCounts = new Map<string, number>();
  const dateCounts = new Map<string, number>();

  let hasEpic = false;
  let hasQuick = false;
  let hasClassic = false;
  let hasTimeTraveller = false;

  for (const movie of watched) {
    if (movie.Country && movie.Country !== 'N/A')
      movie.Country.split(',').forEach(c => countries.add(c.trim()));
    if (movie.Language && movie.Language !== 'N/A')
      movie.Language.split(',').forEach(l => languages.add(l.trim()));
    if (movie.Genre && movie.Genre !== 'N/A')
      movie.Genre.split(',').forEach(g => genres.add(g.trim()));

    const year = parseInt(movie.Year ?? '0', 10);
    if (year > 0) decades.add(Math.floor(year / 10) * 10);
    if (year > 0 && year < 1970) hasClassic = true;
    if (year > 0 && year < 1950) hasTimeTraveller = true;

    const rt = parseInt(movie.Runtime ?? '0', 10);
    if (rt >= 180) hasEpic = true;
    if (rt > 0 && rt < 80) hasQuick = true;

    if (movie.Director && movie.Director !== 'N/A') {
      movie.Director.split(',').map(n => n.trim()).filter(Boolean).forEach(name => {
        directorCounts.set(name, (directorCounts.get(name) ?? 0) + 1);
      });
    }

    if (movie.addedAt) {
      const date = new Date(movie.addedAt).toISOString().slice(0, 10);
      dateCounts.set(date, (dateCounts.get(date) ?? 0) + 1);
    }
  }

  const maxDirectorCount = directorCounts.size > 0 ? Math.max(...directorCounts.values()) : 0;
  const hasBingeDay = [...dateCounts.values()].some(n => n >= 3);

  // Top 100 count
  const watchedIds = new Set(watched.map(m => m.imdbID));
  const watchedTitles = new Set([
    ...watched.map(m => (m.Title || '').toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]);
  const top100Count = TOP_100_MOVIES.filter(
    m => watchedIds.has(m.imdbID) || (m.Title && watchedTitles.has(m.Title.toLowerCase()))
  ).length;

  return [
    { id: 'first_film',       unlocked: count >= 1,   progress: Math.min(count, 1),   target: 1 },
    { id: 'ten_films',        unlocked: count >= 10,  progress: Math.min(count, 10),  target: 10 },
    { id: 'twenty_five_films',unlocked: count >= 25,  progress: Math.min(count, 25),  target: 25 },
    { id: 'fifty_films',      unlocked: count >= 50,  progress: Math.min(count, 50),  target: 50 },
    { id: 'hundred_films',    unlocked: count >= 100, progress: Math.min(count, 100), target: 100 },
    { id: 'two_hundred_films',unlocked: count >= 200, progress: Math.min(count, 200), target: 200 },
    { id: 'top_contender',    unlocked: top100Count >= 10, progress: Math.min(top100Count, 10), target: 10 },
    { id: 'classic',          unlocked: hasClassic },
    { id: 'time_traveller',   unlocked: hasTimeTraveller },
    { id: 'world_explorer',   unlocked: countries.size >= 5,  progress: Math.min(countries.size, 5),  target: 5 },
    { id: 'polyglot',         unlocked: languages.size >= 5,  progress: Math.min(languages.size, 5),  target: 5 },
    { id: 'genre_master',     unlocked: genres.size >= 10,    progress: Math.min(genres.size, 10),    target: 10 },
    { id: 'decade_hopper',    unlocked: decades.size >= 5,    progress: Math.min(decades.size, 5),    target: 5 },
    { id: 'director_devotee', unlocked: maxDirectorCount >= 5, progress: Math.min(maxDirectorCount, 5), target: 5 },
    { id: 'binge_day',        unlocked: hasBingeDay },
    { id: 'epic_viewer',      unlocked: hasEpic },
    { id: 'quick_pick',       unlocked: hasQuick },
  ];
}
