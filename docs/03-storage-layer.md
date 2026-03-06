# Storage Layer

## Database Schema (IndexedDB)

**Database Name:** `mykino`  
**Current Version:** 5  
**Library:** `idb` (Promise-based wrapper around IndexedDB)

## Object Stores

### 1. movies
**KeyPath:** `imdbID`  
**Purpose:** Cache for TMDB API responses

**Data Structure:**
```typescript
interface MovieData {
  imdbID: string;              // Primary key (e.g., "m-123", "tv-456", "tt0111161")
  Title: string;
  OriginalTitle?: string;
  Year: string;
  Poster: string;              // URL or "N/A"
  Type: string;                // "movie" | "series"
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
  _full?: boolean;             // Internal: indicates full details fetched
  _lang?: string;              // Internal: language of cached data
  [key: string]: unknown;
}
```

**Usage:**
- Reduce API calls by caching responses
- Enable offline access to previously viewed content
- Store both search results (partial) and full details

**Characteristics:**
- No automatic expiration (cache indefinitely)
- Can grow large over time
- Cleared only on manual "Clear All Data"

---

### 2. watchlist
**KeyPath:** `imdbID`  
**Purpose:** User's "to watch" list

**Data Structure:**
```typescript
MovieData & {
  addedAt: number;  // Timestamp when added
}
```

**Usage:**
- Store movies/series user wants to watch
- Display in watchlist page
- Show preview on home page
- Exclude from recommendations

**Sorting:** By `addedAt` descending (most recent first)

---

### 3. watched
**KeyPath:** `imdbID`  
**Purpose:** User's watch history

**Data Structure:**
```typescript
MovieData & {
  addedAt: number;  // Timestamp when marked as watched
}
```

**Usage:**
- Track viewing history
- Build taste profile
- Exclude from recommendations
- Calculate achievements

**Sorting:** By `addedAt` descending (most recent first)

**Special Considerations:**
- Used heavily for taste profile calculation
- First 100 items weighted higher in taste profile
- Favourites weighted 3×, top 100 watched weighted 2×

---

### 4. favourites
**KeyPath:** `imdbID`  
**Purpose:** User's favorite movies/series

**Data Structure:**
```typescript
MovieData  // No addedAt timestamp
```

**Usage:**
- Curate all-time best list
- Seed for "Because You Liked" recommendations
- Daily pick selection pool
- Highest weight in taste profile (3×)

**Sorting:** Not sorted (order not critical)

---

### 5. settings
**KeyPath:** `key`  
**Purpose:** App settings and cache

**Data Structure:**
```typescript
{
  key: string;
  value: string;  // JSON-encoded for complex values
}
```

**Common Keys:**

| Key | Value Type | Purpose | TTL |
|-----|-----------|---------|-----|
| `content_preferences` | JSON | Liked/disliked genres, countries, languages | Persistent |
| `taste_profile` | JSON | Computed taste profile | 24h |
| `reco_v3_{lang}` | JSON | Recommendation cache per language | 24h |
| `daily_seed_date` | String | Date of current daily seed (YYYY-MM-DD) | Daily |
| `daily_seed_id` | String | Movie ID for daily seed | Daily |
| `daily_top100_date` | String | Date of current Top 100 pick | Daily |
| `daily_top100_id` | String | Movie ID for Top 100 pick | Daily |
| `id_migration_done` | String | Migration flag | Persistent |
| `data_version` | String | Data schema version | Persistent |

**Content Preferences Structure:**
```typescript
interface ContentPreferences {
  liked_genres: number[];
  disliked_genres: number[];
  liked_countries: string[];
  disliked_countries: string[];
  liked_languages: string[];
  disliked_languages: string[];
}
```

**Taste Profile Structure:**
```typescript
interface TasteProfile {
  topGenres: number[];      // Top 5 genre IDs
  topLanguages: string[];   // Top 3 ISO 639-1 codes
  topCountries: string[];   // Top 3 ISO 3166-1 codes
  topDecades: string[];     // Top 2 (e.g., ["1990s", "2000s"])
  builtAt: number;          // Timestamp for TTL
}
```

**Recommendation Cache Structure:**
```typescript
interface CachedSections {
  sections: RecoSection[];
  cachedAt: number;
  version: 3;
}
```

---

### 6. tv_tracking
**KeyPath:** `tvId`  
**Purpose:** TV series episode tracking

**Data Structure:**
```typescript
interface TVSeriesTracking {
  tvId: string;                                    // "tv-{tmdb_id}"
  status: 'watching' | 'completed' | 'planned';
  seasons: Record<number, {
    watchedEpisodes: number[];                     // Array of episode numbers
  }>;
  totalEpisodesWatched: number;
  numberOfEpisodes?: number;                       // Cached from TMDB
  lastWatchedAt: number;
}
```

**Usage:**
- Track episode-by-episode progress
- Display progress bars on cards
- Show next episode indicators
- Filter "Currently Watching" section

**Example:**
```json
{
  "tvId": "tv-1399",
  "status": "watching",
  "seasons": {
    "1": { "watchedEpisodes": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    "2": { "watchedEpisodes": [1, 2, 3, 4] }
  },
  "totalEpisodesWatched": 14,
  "numberOfEpisodes": 73,
  "lastWatchedAt": 1709740800000
}
```

---

### 7. metadata
**KeyPath:** `key`  
**Purpose:** Cache TMDB metadata (genres, countries, languages)

**Data Structure:**
```typescript
{
  key: string;
  value: any;
  lastUpdated: number;
}
```

**Common Keys:**
- `genres_{lang}` - Genre list for language
- `countries_{lang}` - Country list for language
- `languages_{lang}` - Language list for language

**Usage:**
- Populate filter dropdowns
- Map genre IDs to names
- Reduce API calls for static data

---

## Storage Access Patterns

### Centralized Access
All storage operations go through `lib/db.ts`:

```typescript
// Singleton pattern
let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Migration logic
      }
    });
  }
  return dbPromise;
}
```

### API Functions

**Movies Cache:**
```typescript
getCachedMovie(id: string): Promise<MovieData | undefined>
cacheMovie(movie: MovieData): Promise<void>
```

**Watchlist:**
```typescript
getWatchlist(): Promise<MovieData[]>
addToWatchlist(movie: MovieData): Promise<void>
removeFromWatchlist(id: string): Promise<void>
isInWatchlist(id: string): Promise<boolean>
```

**Watched:**
```typescript
getWatched(): Promise<MovieData[]>
addToWatched(movie: MovieData): Promise<void>
removeFromWatched(id: string): Promise<void>
isWatched(id: string): Promise<boolean>
```

**Favourites:**
```typescript
getFavourites(): Promise<MovieData[]>
addToFavourites(movie: MovieData): Promise<void>
removeFromFavourites(id: string): Promise<void>
isInFavourites(id: string): Promise<boolean>
```

**Settings:**
```typescript
getSetting(key: string): Promise<string | undefined>
setSetting(key: string, value: string): Promise<void>
getContentPreferences(): Promise<ContentPreferences>
setContentPreferences(prefs: ContentPreferences): Promise<void>
```

**TV Tracking:**
```typescript
getTVTracking(tvId: string): Promise<TVSeriesTracking | undefined>
getAllTVTracking(): Promise<TVSeriesTracking[]>
saveTVTracking(tracking: TVSeriesTracking): Promise<void>
deleteTVTracking(tvId: string): Promise<void>
```

**Metadata:**
```typescript
getMetadata<T>(key: string): Promise<T | null>
saveMetadata(key: string, value: any): Promise<void>
```

**Bulk Operations:**
```typescript
exportAllData(): Promise<ExportData>
importAllData(data: ImportData): Promise<void>
clearAllData(): Promise<void>
clearVolatileCaches(): Promise<void>
getDBStats(): Promise<DBStats>
```

---

## Migration Strategy

### Version History
- **v1:** Initial schema (movies, watchlist, favourites, settings)
- **v2:** Added watched store
- **v3:** Added tv_tracking store
- **v4:** Placeholder (no changes)
- **v5:** Added metadata store

### ID Migration (v5)
Migrated from numeric IDs to prefixed IDs:
- `123` → `m-123` (movies)
- `456` → `tv-456` (TV series)
- IMDb IDs (`tt0111161`) unchanged

**Migration Logic:**
```typescript
async function runMigration(db: IDBPDatabase) {
  const isMigrated = await db.get('settings', 'id_migration_done');
  if (isMigrated?.value === 'true') return;

  const storesToMigrate = ['movies', 'watchlist', 'favourites', 'watched'];
  for (const storeName of storesToMigrate) {
    const items = await db.getAll(storeName);
    const toMigrate = items.filter(item => /^\d+$/.test(item.imdbID));

    for (const item of toMigrate) {
      const prefix = item.Type === 'series' || item.Type === 'tv' ? 'tv-' : 'm-';
      const newId = `${prefix}${item.imdbID}`;
      await store.delete(item.imdbID);
      await store.put({ ...item, imdbID: newId });
    }
  }

  await db.put('settings', { key: 'id_migration_done', value: 'true' });
}
```

### Database Name Migration
Migrated from `movieapp` to `mykino` with data transfer:
- Checks for old database
- Copies all stores to new database
- Deletes old database
- 1-second timeout for check (non-blocking)

---

## Storage Characteristics

### Strengths
✅ **Centralized:** All operations through single module  
✅ **Consistent:** Same patterns for all stores  
✅ **Migrations:** Handled automatically on version bump  
✅ **Export/Import:** Full data portability  
✅ **Offline:** Works without network  

### Weaknesses
⚠️ **No Repository Pattern:** Direct IndexedDB calls  
⚠️ **Mixed Concerns:** Cache + user data in same module  
⚠️ **No Abstraction:** Hard to swap storage backend  
⚠️ **No Validation:** No schema validation on write  
⚠️ **Large Module:** 500+ lines in single file  

### Performance Considerations
- IndexedDB operations are async (non-blocking)
- Indexes not used (could improve query performance)
- No pagination for large lists (loads all in memory)
- Cache can grow unbounded (no automatic cleanup)

---

## Cache Strategy

### API Response Cache (movies store)
- **Strategy:** Cache indefinitely
- **Invalidation:** Manual only (Clear All Data)
- **Size:** Unbounded (grows with usage)
- **Benefit:** Offline access, reduced API calls

### Recommendation Cache (settings store)
- **Strategy:** 24-hour TTL
- **Invalidation:** 
  - Automatic after 24h
  - Manual on content preference change
  - Manual on language change
- **Size:** ~100KB per language
- **Benefit:** Fast home page load

### Taste Profile Cache (settings store)
- **Strategy:** 24-hour TTL
- **Invalidation:**
  - Automatic after 24h
  - Manual on watched/favourites change
- **Size:** ~1KB
- **Benefit:** Fast recommendation scoring

### Metadata Cache (metadata store)
- **Strategy:** Cache indefinitely
- **Invalidation:** Manual only
- **Size:** ~50KB per language
- **Benefit:** Instant filter dropdowns

---

## Future Improvements

1. **Repository Pattern:** Abstract storage operations
2. **Validation:** Schema validation on write (Zod)
3. **Indexes:** Add indexes for common queries
4. **Pagination:** Implement cursor-based pagination
5. **Cache Cleanup:** Automatic cleanup of old cache entries
6. **Compression:** Compress large cached objects
7. **Sync:** Optional cloud sync for multi-device
8. **Encryption:** Optional encryption for sensitive data
