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
  original_language?: string;
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
let migrationPromise: Promise<void> | null = null;

async function runMigration(db: IDBPDatabase) {
  const isMigrated = await db.get('settings', 'id_migration_done');
  if (isMigrated?.value === 'true') return;

  const storesToMigrate = ['movies', 'watchlist', 'favourites', 'watched'];
  for (const storeName of storesToMigrate) {
    if (!db.objectStoreNames.contains(storeName)) continue;

    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    let cursor = await store.openCursor();

    while (cursor) {
      const item = cursor.value as MovieData;
      // If the ID is purely numeric, it's a legacy TMDB ID
      if (/^\d+$/.test(item.imdbID)) {
        const prefix = item.Type === 'series' || item.Type === 'tv' ? 'tv-' : 'm-';
        const newId = `${prefix}${item.imdbID}`;
        
        // Delete old record
        await cursor.delete();
        
        // Add new record with prefixed ID
        const newItem = { ...item, imdbID: newId };
        await store.put(newItem);
      }
      cursor = await cursor.continue();
    }
  }

  // Mark migration as complete
  const txSettings = db.transaction('settings', 'readwrite');
  await txSettings.objectStore('settings').put({ key: 'id_migration_done', value: 'true' });
}

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
    
    // Chain migration to initialization so it only runs once per boot
    migrationPromise = dbPromise.then(runMigration);
  }
  
  // Wait for migration to finish before returning DB in case callers need migrated data
  return migrationPromise ? migrationPromise.then(() => dbPromise!) : dbPromise;
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
  const [watchlist, watched, favourites, settings] = await Promise.all([
    getWatchlist(),
    getWatched(),
    getFavourites(),
    getDB().then(db => db.getAll('settings')),
  ]);
  return { version: 1, exportedAt: Date.now(), watchlist, watched, favourites, settings };
}

export async function importAllData(data: {
  watchlist?: MovieData[];
  watched?: MovieData[];
  favourites?: MovieData[];
  settings?: { key: string; value: string }[];
}) {
  const db = await getDB();
  const tx = db.transaction(['watchlist', 'watched', 'favourites', 'settings'], 'readwrite');
  for (const m of data.watchlist ?? []) tx.objectStore('watchlist').put(m);
  for (const m of data.watched ?? []) tx.objectStore('watched').put(m);
  for (const m of data.favourites ?? []) tx.objectStore('favourites').put(m);
  for (const s of data.settings ?? []) tx.objectStore('settings').put(s);
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
