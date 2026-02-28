import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'movieapp';
const DB_VERSION = 2;

export interface MovieData {
  imdbID: string;
  Title: string;
  OriginalTitle?: string;
  Year: string;
  Poster: string;
  Type: string;
  Plot?: string;
  Director?: string;
  Actors?: string;
  Genre?: string;
  Runtime?: string;
  imdbRating?: string;
  Rated?: string;
  Released?: string;
  Writer?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Metascore?: string;
  imdbVotes?: string;
  BoxOffice?: string;
  Production?: string;
  TrailerKey?: string;
  genre_ids?: number[];
  origin_country?: string[];
  addedAt?: number;
  [key: string]: unknown;
}

export interface ContentPreferences {
  liked_genres: number[];
  disliked_genres: number[];
  liked_countries: string[];
  disliked_countries: string[];
  liked_languages: string[];
  disliked_languages: string[];
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('movies', { keyPath: 'imdbID' });
          db.createObjectStore('watchlist', { keyPath: 'imdbID' });
          db.createObjectStore('favourites', { keyPath: 'imdbID' });
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('watched', { keyPath: 'imdbID' });
        }
      },
    });
  }
  return dbPromise;
}

// Movies cache
export async function getCachedMovie(id: string): Promise<MovieData | undefined> {
  const db = await getDB();
  return db.get('movies', id);
}

export async function cacheMovie(movie: MovieData) {
  const db = await getDB();
  await db.put('movies', movie);
}

// Watchlist
export async function getWatchlist(): Promise<MovieData[]> {
  const db = await getDB();
  const list = await db.getAll('watchlist');
  return list.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

export async function addToWatchlist(movie: MovieData) {
  const db = await getDB();
  await db.put('watchlist', { ...movie, addedAt: Date.now() });
}

export async function removeFromWatchlist(id: string) {
  const db = await getDB();
  await db.delete('watchlist', id);
}

export async function isInWatchlist(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('watchlist', id);
  return !!item;
}

// Favourites
export async function getFavourites(): Promise<MovieData[]> {
  const db = await getDB();
  return db.getAll('favourites');
}

export async function addToFavourites(movie: MovieData) {
  const db = await getDB();
  await db.put('favourites', movie);
}

export async function removeFromFavourites(id: string) {
  const db = await getDB();
  await db.delete('favourites', id);
}

export async function isInFavourites(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('favourites', id);
  return !!item;
}

// Watched
export async function getWatched(): Promise<MovieData[]> {
  const db = await getDB();
  const list = await db.getAll('watched');
  return list.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

export async function addToWatched(movie: MovieData) {
  const db = await getDB();
  await db.put('watched', { ...movie, addedAt: Date.now() });
}

export async function removeFromWatched(id: string) {
  const db = await getDB();
  await db.delete('watched', id);
}

export async function isWatched(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('watched', id);
  return !!item;
}

// Export / Import
export async function exportAllData() {
  const [watchlist, watched, favourites] = await Promise.all([
    getWatchlist(),
    getWatched(),
    getFavourites(),
  ]);
  return { version: 1, exportedAt: Date.now(), watchlist, watched, favourites };
}

export async function importAllData(data: {
  watchlist?: MovieData[];
  watched?: MovieData[];
  favourites?: MovieData[];
}) {
  const db = await getDB();
  const tx = db.transaction(['watchlist', 'watched', 'favourites'], 'readwrite');
  for (const m of data.watchlist ?? []) tx.objectStore('watchlist').put(m);
  for (const m of data.watched ?? []) tx.objectStore('watched').put(m);
  for (const m of data.favourites ?? []) tx.objectStore('favourites').put(m);
  await tx.done;
}

// Settings
export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value;
}

export async function setSetting(key: string, value: string) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// Content Preferences
export async function getContentPreferences(): Promise<ContentPreferences> {
  const val = await getSetting('content_preferences');
  if (!val) return {
    liked_genres: [],
    disliked_genres: [],
    liked_countries: [],
    disliked_countries: [],
    liked_languages: [],
    disliked_languages: [],
  };
  try {
    return JSON.parse(val);
  } catch {
    return {
      liked_genres: [],
      disliked_genres: [],
      liked_countries: [],
      disliked_countries: [],
      liked_languages: [],
      disliked_languages: [],
    };
  }
}

export async function setContentPreferences(prefs: ContentPreferences) {
  await setSetting('content_preferences', JSON.stringify(prefs));
}
