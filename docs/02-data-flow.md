# Data Flow Analysis

This document traces how data moves through the system for key user journeys.

## 1. User Search Flow

```
SearchPage.tsx
  ↓
  [user types query]
  ↓
  useEffect (debounced 400ms)
  ↓
  lib/api.ts::searchMovies(query, page, lang)
  ↓
  lib/tmdb.ts::searchMovies()
  ↓
  TMDB API: GET /search/multi?query={query}&page={page}
  ↓
  Response: { results: TmdbSearchItem[], total_results: number }
  ↓
  mapTmdbItemToMovieData() - Transform TMDB format to MovieData
  ↓
  For each result:
    lib/db.ts::getCachedMovie(id) - Check if already cached
    If not cached:
      lib/db.ts::cacheMovie(movie) - Store in IndexedDB
  ↓
  IndexedDB 'movies' store (cache)
  ↓
  setState(results) - Update React state
  ↓
  SearchResultCard components render
```

**Key Points:**
- 400ms debounce prevents excessive API calls
- Results are cached in IndexedDB for offline access
- Client-side filtering applied if filters are active
- Infinite scroll triggers additional page fetches

## 2. Movie Details Flow

```
MovieDetailsPage.tsx
  ↓
  useQuery(['movie', id, lang])
  ↓
  lib/api.ts::getMovieDetails(id, lang)
  ↓
  lib/db.ts::getCachedMovie(id) - Check cache first
  ↓
  If cached && full details && correct language:
    Return cached MovieData
  Else:
    ↓
    lib/tmdb.ts::getMovieDetails(id, lang)
    ↓
    Determine ID type:
      - If starts with 'tt': IMDb ID → use /find endpoint
      - If starts with 'tv-': TV series → use /tv endpoint
      - If starts with 'm-': Movie → use /movie endpoint
      - Else: Try /movie, fallback to /tv
    ↓
    TMDB API: GET /movie/{id}?append_to_response=credits,videos
    or: GET /tv/{id}?append_to_response=credits,videos
    ↓
    Response: TmdbMovieDetail or TmdbTVDetail
    ↓
    mapMovieDetail() or mapTVDetail()
      - Extract director from credits.crew
      - Extract actors from credits.cast
      - Extract trailer from videos.results
      - Map genres, countries, languages
    ↓
    If no trailer in current language:
      Fetch again with lang='en-US' for trailer fallback
    ↓
    lib/db.ts::cacheMovie({ ...movie, _full: true, _lang: lang })
    ↓
    IndexedDB 'movies' store
    ↓
    Return MovieData
  ↓
  React Query caches result (5 min staleTime)
  ↓
  UI renders movie details
```

**Key Points:**
- Cache-first strategy reduces API calls
- Language-specific caching prevents stale translations
- Trailer fallback to English if not available in user's language
- React Query provides additional in-memory caching

## 3. AI Recommendation Flow

```
SearchPage.tsx (AI toggle ON)
  ↓
  doAISearch(query, pageNum)
  ↓
  Parallel data gathering:
    - lib/tasteProfile.ts::getOrBuildTasteProfile()
    - lib/db.ts::getContentPreferences()
    - lib/db.ts::getFavourites()
    - lib/db.ts::getWatchlist()
    - lib/db.ts::getWatched()
  ↓
  lib/ai/index.ts::getAIRecommendations({
    query,
    tasteProfile,
    contentPreferences,
    favourites: top 10,
    watchlist: top 100,
    watched: top 100
  })
  ↓
  lib/ai/clients/{provider}.ts::generateRecommendations()
  ↓
  AI API call (OpenAI/Anthropic/Gemini/Mistral/Ollama)
    Prompt includes:
      - User query
      - Taste profile (top genres, languages, countries, decades)
      - Content preferences (liked/disliked)
      - Exclusions (watched, watchlist)
      - Request for 30 (first page) or 20 (subsequent) recommendations
  ↓
  AI Response: JSON array of { title, year, reason }
  ↓
  Deduplicate by title (case-insensitive)
  ↓
  For each unique recommendation:
    lib/api.ts::searchMovies(title, 1, lang)
    ↓
    Get first result (best match)
    ↓
    lib/api.ts::getMovieDetails(id, lang)
    ↓
    Fetch full details
  ↓
  Client-side filtering:
    - Remove if in watchlist (watchlistIds.has(id))
    - Remove if already watched (watchedIds.has(id))
    - Remove if from disliked country (hard block)
    - Remove if ALL languages are disliked (soft block)
  ↓
  Attach aiReason to each MovieData
  ↓
  setState(results with aiReason)
  ↓
  SearchResultCard renders with reason displayed
```

**Key Points:**
- AI receives taste profile for personalization
- Exclusions sent to AI, but also filtered client-side (defense in depth)
- Deduplication happens before TMDB lookups (efficiency)
- Hard block on disliked countries, soft block on languages
- Pagination supported (page 1: 30 items, page 2+: 20 items)

## 4. Recommendation Generation Flow

```
Index.tsx (Home page)
  ↓
  useRecommendations()
  ↓
  lib/recommendations.ts::getHomeSections(lang)
  ↓
  Check cache:
    lib/db.ts::getSetting(`reco_v3_${lang}`)
    ↓
    If cached && age < 24h:
      Return cached sections
    Else:
      ↓
      Parallel data gathering:
        - lib/db.ts::getWatched()
        - lib/db.ts::getWatchlist()
        - lib/db.ts::getFavourites()
        - lib/db.ts::getContentPreferences()
      ↓
      lib/tasteProfile.ts::getOrBuildTasteProfile()
        - Tally genres, languages, countries, decades
        - Weight: Favourites ×3, Top 100 watched ×2, Rest ×1
        - Return top 5 genres, top 3 languages, top 3 countries, top 2 decades
      ↓
      getDailySeed(favourites)
        - Pool: 3 most recent + 2 highest rated
        - Deterministic selection by date hash
        - Store in settings for consistency
      ↓
      Parallel fetch 6 sources (5 pages each):
        1. getRecommendations(seedId, type, lang, pages 1-5)
        2. getSimilar(seedId, type, lang, pages 1-5)
        3. discoverMovies({ genre: top 3, rating ≥ 6.5, votes ≥ 200 }, pages 1-5)
        4. getNowPlaying(lang, page 1) - Only 1 page
        5. getTrending(lang, pages 1-5)
        6. getPopular(lang, pages 1-5)
        7. discoverMovies({ rating ≥ 7.5, votes 100-5000 }, pages 1-5) - Hidden Gems
      ↓
      For each source:
        - Deduplicate by imdbID
        - Exclude watched and watchlist items
        - Apply content preferences (disliked filters)
        - Score by taste profile:
          * Top genre: +5
          * Other top genres: +3
          * Top language: +3
          * Other top languages: +1
          * Top countries: +2
          * Top decade: +2
          * Rating ≥ 7.0: +2
          * Rating ≥ 6.0: +1
          * Liked genre: +3
          * Liked country: +2
          * Liked language: +2
        - Sort by score descending
        - Take top 100
      ↓
      Build sections array:
        - becauseLiked (if seed exists)
        - byGenre (if top genres exist)
        - nowPlaying
        - trending
        - popular
        - hiddenGems
      ↓
      lib/db.ts::setSetting(`reco_v3_${lang}`, JSON.stringify({
        sections,
        cachedAt: Date.now(),
        version: 3
      }))
      ↓
      IndexedDB 'settings' store
      ↓
      Return sections
  ↓
  React Query caches result
  ↓
  UI renders horizontal scrolling sections
```

**Key Points:**
- 24h cache reduces API load
- Parallel fetching (5 pages per source) provides rich results
- Scoring algorithm personalizes recommendations
- Daily seed ensures variety while maintaining consistency
- Cache invalidated when content preferences change

## 5. Saving to Watchlist Flow

```
MovieDetailsPage.tsx
  ↓
  [user clicks "Add to Watchlist" button]
  ↓
  lib/db.ts::addToWatchlist(movie)
  ↓
  getDB() - Get IndexedDB connection
  ↓
  IndexedDB.put('watchlist', { ...movie, addedAt: Date.now() })
  ↓
  Promise resolves
  ↓
  queryClient.invalidateQueries(['watchlist'])
  ↓
  All components using watchlist data refetch
  ↓
  UI updates:
    - Button changes to "Remove from Watchlist"
    - Movie appears in watchlist page
    - Home page watchlist section updates
```

**Key Points:**
- Optimistic UI updates possible (not currently implemented)
- React Query handles cache invalidation
- addedAt timestamp enables chronological sorting
- Same pattern for watched and favourites

## 6. Data Persistence Flow

All data operations flow through `lib/db.ts`:

```
Application Layer (Components/Hooks)
  ↓
lib/db.ts (Centralized API)
  ↓
getDB() - Singleton IDBPDatabase instance
  ↓
openDB('mykino', version: 5)
  ↓
Object Stores:
  - movies (cache)
  - watchlist
  - watched
  - favourites
  - settings (preferences, cache)
  - tv_tracking
  - metadata (genres, countries, languages)
  ↓
All operations return Promises
  ↓
React Query manages cache invalidation
  ↓
UI updates reactively
```

**Key Points:**
- Single source of truth for storage operations
- Migrations handled in upgrade callback
- All operations are async (Promise-based)
- React Query provides additional caching layer
- Export/import functionality for data portability

## 7. TV Episode Tracking Flow

```
TVShowPage.tsx
  ↓
  [user toggles episode checkbox]
  ↓
  handleEpisodeToggle(seasonNum, episodeNum)
  ↓
  Update local state:
    - Add/remove episode from season's watchedEpisodes array
    - Recalculate totalEpisodesWatched
    - Update status if needed:
      * All episodes watched → 'completed'
      * Some episodes watched → 'watching'
      * No episodes watched → 'planned'
  ↓
  lib/tvTracking.ts::saveTVTracking({
    tvId,
    status,
    seasons,
    totalEpisodesWatched,
    numberOfEpisodes,
    lastWatchedAt: Date.now()
  })
  ↓
  getDB()
  ↓
  IndexedDB.put('tv_tracking', tracking)
  ↓
  Promise resolves
  ↓
  UI updates:
    - Checkbox state changes
    - Progress bar updates
    - Status badge updates
    - Next episode indicator updates
```

**Key Points:**
- Granular episode-level tracking
- Automatic status transitions
- Progress calculation on-demand
- Stored separately from watchlist/watched

## Common Patterns

### Cache-First Strategy
1. Check IndexedDB cache
2. If found and valid → return cached
3. Else → fetch from API
4. Store in cache
5. Return fresh data

### React Query Integration
- Provides in-memory caching (5 min staleTime typical)
- Automatic background refetching
- Cache invalidation on mutations
- Loading/error states

### Error Handling
- API errors caught and logged
- Fallback to cached data when possible
- User-friendly error messages via toast
- Graceful degradation (e.g., no trailer → hide player)

### Optimistic Updates
- Not widely implemented currently
- Opportunity for improvement in refactoring
