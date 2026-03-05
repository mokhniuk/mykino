import { openDB, IDBPDatabase } from 'idb';
import type { TVSeriesTracking } from './tvTracking';

const DB_NAME = 'mykino';
const DB_VERSION = 5;
const APP_DATA_VERSION = 5;

// Temporary export for debugging
if (typeof window !== 'undefined') {
  (window as any).getCurrentDBName = () => DB_NAME;
}

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
let dbNameMigrationDone = false;

async function runMigration(db: IDBPDatabase) {
  const isMigrated = await db.get('settings', 'id_migration_done');
  if (isMigrated?.value === 'true') return;

  // Collect items to migrate first to avoid cursor redundancy/looping
  const storesToMigrate = ['movies', 'watchlist', 'favourites', 'watched'];
  for (const storeName of storesToMigrate) {
    if (!db.objectStoreNames.contains(storeName)) continue;

    const items = await db.getAll(storeName);
    const toMigrate = items.filter(item => /^\d+$/.test(item.imdbID));

    if (toMigrate.length === 0) continue;

    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const item of toMigrate) {
      const prefix = item.Type === 'series' || item.Type === 'tv' ? 'tv-' : 'm-';
      const newId = `${prefix}${item.imdbID}`;

      await store.delete(item.imdbID);
      await store.put({ ...item, imdbID: newId });
    }
    await tx.done;
  }

  // Mark migration as complete
  try {
    await db.put('settings', { key: 'id_migration_done', value: 'true' });
  } catch (e) {
    console.error('Failed to mark migration as done', e);
  }
}

async function safeRunMigration(db: IDBPDatabase) {
  try {
    await runMigration(db);
  } catch (e) {
    console.error('Critical: Migration failed', e);
    // We don't re-throw because we don't want to block the entire app
  }
}

async function migrateFromOldDatabase() {
  if (dbNameMigrationDone) return;
  dbNameMigrationDone = true;

  try {
    // Quick check with timeout
    const dbCheckPromise = (async () => {
      const allDBs = await indexedDB.databases();
      const hasOldDB = allDBs?.some(db => db.name === 'movieapp');
      if (!hasOldDB) return false;
      
      const oldDB = await openDB('movieapp', 5);
      const [watchlistCount, watchedCount, favouritesCount, settingsCount] = await Promise.all([
        oldDB.count('watchlist'),
        oldDB.count('watched'),
        oldDB.count('favourites'),
        oldDB.count('settings'),
      ]);
      
      const hasData = watchlistCount > 0 || watchedCount > 0 || favouritesCount > 0 || settingsCount > 0;
      
      if (!hasData) {
        oldDB.close();
        indexedDB.deleteDatabase('movieapp');
        return false;
      }
      
      return { oldDB, watchlistCount, watchedCount, favouritesCount, settingsCount };
    })();
    
    const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), 1000));
    const result = await Promise.race([dbCheckPromise, timeout]);
    
    if (!result) return; // No old DB or timed out
    
    const { oldDB, watchlistCount, watchedCount, favouritesCount, settingsCount } = result;

    console.log('Migrating data from movieapp to mykino...', {
      watchlist: watchlistCount,
      watched: watchedCount,
      favourites: favouritesCount,
      settings: settingsCount,
    });
    
    const newDB = await openDB(DB_NAME, DB_VERSION, {
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
        if (oldVersion < 3) {
          db.createObjectStore('tv_tracking', { keyPath: 'tvId' });
        }
        if (oldVersion < 4) {
          // Placeholder for version 4 compatibility
        }
        if (oldVersion < 5) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });

    // Copy all stores
    const stores = ['movies', 'watchlist', 'watched', 'favourites', 'settings', 'tv_tracking', 'metadata'];
    for (const storeName of stores) {
      if (!oldDB.objectStoreNames.contains(storeName)) continue;
      
      const items = await oldDB.getAll(storeName);
      if (items.length === 0) continue;

      const tx = newDB.transaction(storeName, 'readwrite');
      for (const item of items) {
        await tx.objectStore(storeName).put(item);
      }
      await tx.done;
      console.log(`Migrated ${items.length} items from ${storeName}`);
    }

    oldDB.close();
    newDB.close();
    
    // Delete old database
    indexedDB.deleteDatabase('movieapp');
    console.log('Migration complete. Old database deleted.');
  } catch (e) {
    console.error('Database name migration failed:', e);
  }
}

export async function getDB() {
  if (!dbPromise) {
    // Migrate from old database if needed (with 1s timeout for check)
    await migrateFromOldDatabase();

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
        if (oldVersion < 3) {
          db.createObjectStore('tv_tracking', { keyPath: 'tvId' });
        }
        if (oldVersion < 4) {
          // Placeholder for version 4 compatibility
        }
        if (oldVersion < 5) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });

    // Fire migration in background
    dbPromise.then(safeRunMigration);
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
  const db = await getDB();
  const [watchlist, watched, favourites, settings, tvTracking, movies] = await Promise.all([
    getWatchlist(),
    getWatched(),
    getFavourites(),
    db.getAll('settings'),
    db.getAll('tv_tracking'),
    db.getAll('movies'),
  ]);
  return { version: 1, exportedAt: Date.now(), watchlist, watched, favourites, settings, tvTracking, movies };
}

export async function importAllData(data: {
  watchlist?: MovieData[];
  watched?: MovieData[];
  favourites?: MovieData[];
  settings?: { key: string; value: string }[];
  tvTracking?: TVSeriesTracking[];
}) {
  const db = await getDB();
  const hasTVTracking = (data.tvTracking?.length ?? 0) > 0;
  const stores: string[] = ['watchlist', 'watched', 'favourites', 'settings'];
  if (hasTVTracking) stores.push('tv_tracking');

  const tx = db.transaction(stores, 'readwrite');

  // Clear existing data to ensure a clean restore (replacement, not merge)
  for (const store of stores) {
    tx.objectStore(store).clear();
  }

  for (const m of data.watchlist ?? []) tx.objectStore('watchlist').put(m);
  for (const m of data.watched ?? []) tx.objectStore('watched').put(m);
  for (const m of data.favourites ?? []) tx.objectStore('favourites').put(m);
  for (const s of data.settings ?? []) tx.objectStore('settings').put(s);
  for (const t of data.tvTracking ?? []) tx.objectStore('tv_tracking').put(t);

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

export async function clearVolatileCaches() {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.key.toString().startsWith('reco_')) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
}

export async function clearAllData() {
  const db = await getDB();
  const stores = ['movies', 'watchlist', 'watched', 'favourites', 'settings', 'tv_tracking'];
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(store => tx.objectStore(store).clear()));
  await tx.done;
}

export interface DBStats {
  movies: number;
  watchlist: number;
  watched: number;
  favourites: number;
  tvTracking: number;
}

export async function getDBStats(): Promise<DBStats> {
  const db = await getDB();
  const [movies, watchlist, watched, favourites, tvTracking] = await Promise.all([
    db.count('movies'),
    db.count('watchlist'),
    db.count('watched'),
    db.count('favourites'),
    db.count('tv_tracking'),
  ]);
  return { movies, watchlist, watched, favourites, tvTracking };
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

// Metadata caching (genres, countries, languages)
export async function getMetadata<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const result = await db.get('metadata', key);
  return result?.value ?? null;
}

export async function saveMetadata(key: string, value: any) {
  const db = await getDB();
  await db.put('metadata', { key, value, lastUpdated: Date.now() });
}

// Repair corrupted watched table - REMOVED
// This function was too aggressive and could delete data
// Manual database deletion is safer
