# Step-by-Step Refactoring Plan

This document provides a safe, incremental refactoring plan that keeps the application working at all times.

## Guiding Principles

1. **Incremental:** Small, testable changes
2. **Non-breaking:** App stays functional throughout
3. **Reversible:** Each step can be rolled back
4. **Tested:** Verify after each step
5. **Documented:** Update docs as you go

## Phase 1: Foundation (Core Infrastructure)

### Step 1.1: Create New Folder Structure
**Goal:** Set up the target folder structure without breaking existing code

**Actions:**
```bash
mkdir -p src/core/{storage,config,utils,ai}
mkdir -p src/domain/{models,services,repositories}
mkdir -p src/providers/movies
mkdir -p src/features/{search,library,details,recommendations,achievements,settings,onboarding}
mkdir -p src/ui/{primitives,layout,feedback}
mkdir -p src/types
```

**Verification:**
- Folders exist
- App still builds and runs
- No import errors

---

### Step 1.2: Extract Storage Adapter
**Goal:** Create storage abstraction layer

**Actions:**
1. Create `core/storage/types.ts`:
```typescript
export interface StorageAdapter {
  get<T>(store: string, key: string): Promise<T | null>;
  getAll<T>(store: string): Promise<T[]>;
  put<T>(store: string, value: T): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  clear(store: string): Promise<void>;
  count(store: string): Promise<number>;
}
```

2. Create `core/storage/IndexedDBAdapter.ts`:
```typescript
import { openDB, IDBPDatabase } from 'idb';
import type { StorageAdapter } from './types';

export class IndexedDBAdapter implements StorageAdapter {
  constructor(
    private dbName: string,
    private version: number,
    private upgrade: (db: IDBPDatabase) => void
  ) {}
  
  private dbPromise: Promise<IDBPDatabase> | null = null;
  
  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.dbName, this.version, {
        upgrade: this.upgrade
      });
    }
    return this.dbPromise;
  }
  
  async get<T>(store: string, key: string): Promise<T | null> {
    const db = await this.getDB();
    return (await db.get(store, key)) ?? null;
  }
  
  async getAll<T>(store: string): Promise<T[]> {
    const db = await this.getDB();
    return db.getAll(store);
  }
  
  async put<T>(store: string, value: T): Promise<void> {
    const db = await this.getDB();
    await db.put(store, value);
  }
  
  async delete(store: string, key: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(store, key);
  }
  
  async clear(store: string): Promise<void> {
    const db = await this.getDB();
    await db.clear(store);
  }
  
  async count(store: string): Promise<number> {
    const db = await this.getDB();
    return db.count(store);
  }
}
```

3. Create `core/storage/migrations.ts`:
```typescript
import type { IDBPDatabase } from 'idb';

export function upgradeDB(db: IDBPDatabase, oldVersion: number) {
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
  if (oldVersion < 5) {
    db.createObjectStore('metadata', { keyPath: 'key' });
  }
}
```

**Verification:**
- New files compile
- No runtime errors
- Existing `lib/db.ts` still works

---

### Step 1.3: Extract Utilities
**Goal:** Move shared utilities to `core/utils/`

**Actions:**
1. Create `core/utils/date.ts`:
```typescript
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h += dateStr.charCodeAt(i);
  }
  return h;
}

export function getDeterministicSelection<T>(
  items: T[],
  date: Date = new Date()
): T {
  const dateStr = date.toISOString().slice(0, 10);
  const hash = dateHash(dateStr);
  return items[hash % items.length];
}
```

2. Create `core/utils/cache.ts`:
```typescript
export class CacheManager<T> {
  constructor(
    private storage: Storage,
    private key: string,
    private ttl: number
  ) {}
  
  async get(): Promise<T | null> {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    
    try {
      const { value, cachedAt } = JSON.parse(raw);
      if (Date.now() - cachedAt > this.ttl) {
        this.storage.removeItem(this.key);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  
  async set(value: T): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify({
      value,
      cachedAt: Date.now()
    }));
  }
  
  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}
```

3. Move `lib/format.ts` → `core/utils/format.ts`
4. Move `lib/utils.ts` → `core/utils/index.ts`

**Verification:**
- Utilities compile
- Update imports in existing code
- App still works

---

### Step 1.4: Extract Configuration
**Goal:** Move config to `core/config/`

**Actions:**
1. Move `lib/i18n.tsx` → `core/config/i18n.tsx`
2. Move `lib/theme.tsx` → `core/config/theme.tsx`
3. Create `core/config/constants.ts`:
```typescript
export const DB_NAME = 'mykino';
export const DB_VERSION = 5;
export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
export const FETCH_PAGES = 5;
export const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
```

**Verification:**
- Config files compile
- Update imports throughout app
- App still works

---

## Phase 2: Domain Layer

### Step 2.1: Create Domain Models
**Goal:** Define domain entities

**Actions:**
1. Create `domain/models/MediaItem.ts` (see 07-domain-abstraction.md)
2. Create `domain/models/Movie.ts` (extends MediaItem)
3. Create `domain/models/TVSeries.ts` (extends MediaItem)
4. Create `domain/models/Collection.ts`
5. Create `domain/models/TasteProfile.ts`
6. Create `domain/models/Achievement.ts`

**Verification:**
- Models compile
- Type definitions are correct
- No circular dependencies

---

### Step 2.2: Create Repository Interfaces
**Goal:** Define data access contracts

**Actions:**
1. Create `domain/repositories/IMediaRepository.ts`
2. Create `domain/repositories/ICollectionRepository.ts`
3. Create `domain/repositories/ISettingsRepository.ts`

**Verification:**
- Interfaces compile
- Clear contracts defined

---

### Step 2.3: Implement Repositories
**Goal:** Create concrete repository implementations

**Actions:**
1. Create `core/storage/Repository.ts`:
```typescript
import type { StorageAdapter } from './types';
import type { IMediaRepository } from '@/domain/repositories/IMediaRepository';

export class Repository<T extends { id: string }> 
  implements IMediaRepository<T> {
  constructor(
    private adapter: StorageAdapter,
    private storeName: string
  ) {}
  
  async getAll(): Promise<T[]> {
    return this.adapter.getAll<T>(this.storeName);
  }
  
  async getById(id: string): Promise<T | null> {
    return this.adapter.get<T>(this.storeName, id);
  }
  
  async add(item: T): Promise<void> {
    await this.adapter.put(this.storeName, item);
  }
  
  async update(item: T): Promise<void> {
    await this.adapter.put(this.storeName, item);
  }
  
  async remove(id: string): Promise<void> {
    await this.adapter.delete(this.storeName, id);
  }
  
  async exists(id: string): Promise<boolean> {
    const item = await this.getById(id);
    return item !== null;
  }
  
  async clear(): Promise<void> {
    await this.adapter.clear(this.storeName);
  }
  
  async count(): Promise<number> {
    return this.adapter.count(this.storeName);
  }
}
```

2. Update `lib/db.ts` to use repositories internally (gradual migration)

**Verification:**
- Repositories work
- Existing code still uses `lib/db.ts`
- No breaking changes

---

### Step 2.4: Create Domain Services
**Goal:** Extract business logic into services

**Actions:**
1. Create `domain/services/TasteProfileService.ts`
2. Create `domain/services/RecommendationService.ts`
3. Create `domain/services/AchievementService.ts`
4. Create `domain/services/CollectionService.ts`

**Verification:**
- Services compile
- Logic extracted from lib files
- Services are testable

---

## Phase 3: Provider Layer

### Step 3.1: Create Provider Interface
**Goal:** Define provider contract

**Actions:**
1. Create `providers/IMediaProvider.ts` (see 07-domain-abstraction.md)
2. Define `SearchResult`, `DiscoverFilters` types

**Verification:**
- Interface compiles
- Clear contract defined

---

### Step 3.2: Implement TMDB Provider
**Goal:** Wrap TMDB API in provider interface

**Actions:**
1. Create `providers/movies/TMDBTypes.ts` (TMDB-specific types)
2. Create `providers/movies/TMDBMapper.ts` (TMDB → Movie mapping)
3. Create `providers/movies/TMDBProvider.ts`:
```typescript
import type { IMediaProvider } from '../IMediaProvider';
import type { Movie } from '@/domain/models/Movie';

export class TMDBProvider implements IMediaProvider<Movie> {
  readonly mediaType = 'movie' as const;
  
  constructor(private apiKey: string) {}
  
  async search(query: string, page = 1): Promise<SearchResult<Movie>> {
    // Implementation from lib/tmdb.ts
  }
  
  async getDetails(id: string): Promise<Movie | null> {
    // Implementation from lib/tmdb.ts
  }
  
  // ... other methods
}
```

4. Keep `lib/tmdb.ts` for now (gradual migration)

**Verification:**
- Provider compiles
- Provider works with domain models
- Existing code still uses `lib/tmdb.ts`

---

### Step 3.3: Update API Abstraction
**Goal:** Make `lib/api.ts` use provider

**Actions:**
1. Update `lib/api.ts`:
```typescript
import { TMDBProvider } from '@/providers/movies/TMDBProvider';

const provider = new TMDBProvider(import.meta.env.VITE_TMDB_API_KEY);

export const searchMovies = provider.search.bind(provider);
export const getMovieDetails = provider.getDetails.bind(provider);
// ... other exports
```

**Verification:**
- Existing code still works
- No breaking changes
- Provider is used internally

---

## Phase 4: Feature Migration

### Step 4.1: Migrate Search Feature
**Goal:** Move search to feature module

**Actions:**
1. Create `features/search/components/`:
   - `SearchBar.tsx` (extract from SearchPage)
   - `FilterPanel.tsx` (extract from SearchPage)
   - `MoodChips.tsx` (extract from SearchPage)
   - `ResultsList.tsx` (extract from SearchPage)

2. Create `features/search/hooks/`:
   - `useSearch.ts` (extract logic from SearchPage)
   - `useAISearch.ts` (extract AI logic from SearchPage)

3. Create `features/search/SearchPage.tsx` (simplified orchestrator)

4. Update router to use new SearchPage

5. Keep old `pages/SearchPage.tsx` temporarily

**Verification:**
- New search page works
- All features functional
- Can switch between old/new

---

### Step 4.2: Migrate Library Feature
**Goal:** Move watchlist/watched/favorites to feature module

**Actions:**
1. Create `features/library/components/`:
   - `CollectionView.tsx` (generic list view)
   - `MediaCard.tsx` (rename from MovieCard)
   - `FilterTabs.tsx` (movies/series filter)

2. Create `features/library/hooks/`:
   - `useWatchlist.ts`
   - `useWatched.ts`
   - `useFavorites.ts`

3. Create pages:
   - `features/library/WatchlistPage.tsx`
   - `features/library/WatchedPage.tsx`
   - `features/library/FavoritesPage.tsx`

4. Update router

**Verification:**
- Library pages work
- Collections functional
- Can add/remove items

---

### Step 4.3: Migrate Details Feature
**Goal:** Move movie/TV details to feature module

**Actions:**
1. Create `features/details/components/`:
   - `MediaHeader.tsx`
   - `MetadataSection.tsx`
   - `ActionButtons.tsx`
   - `TrailerPlayer.tsx`

2. Create `features/details/hooks/`:
   - `useMediaDetails.ts`

3. Create pages:
   - `features/details/MovieDetailsPage.tsx`
   - `features/details/TVShowPage.tsx`

4. Update router

**Verification:**
- Details pages work
- All metadata displays
- Actions work (watchlist, watched, favorites)

---

### Step 4.4: Migrate Recommendations Feature
**Goal:** Move recommendations to feature module

**Actions:**
1. Create `features/recommendations/components/`:
   - `RecommendationSection.tsx`
   - `SectionCard.tsx`

2. Create `features/recommendations/hooks/`:
   - `useRecommendations.ts` (use RecommendationService)

3. Create pages:
   - `features/recommendations/HomePage.tsx` (rename from Index)
   - `features/recommendations/SectionPage.tsx`

4. Update router

**Verification:**
- Home page works
- Recommendations load
- Sections functional

---

### Step 4.5: Migrate Achievements Feature
**Goal:** Move achievements to feature module

**Actions:**
1. Create `features/achievements/components/`:
   - `Top100Grid.tsx`
   - `DirectorCard.tsx`
   - `MilestoneCard.tsx`

2. Create `features/achievements/hooks/`:
   - `useAchievements.ts` (use AchievementService)

3. Create pages:
   - `features/achievements/Top100Page.tsx`
   - `features/achievements/DirectorPage.tsx`
   - `features/achievements/MilestonesPage.tsx`

4. Update router

**Verification:**
- Achievement pages work
- Progress tracking works
- Daily picks work

---

### Step 4.6: Migrate Settings Feature
**Goal:** Move settings to feature module

**Actions:**
1. Create `features/settings/components/`:
   - `LanguageSelector.tsx`
   - `ThemeSelector.tsx`
   - `ContentPreferences.tsx`
   - `AISettings.tsx`
   - `DataManagement.tsx`

2. Create `features/settings/SettingsPage.tsx`

3. Update router

**Verification:**
- Settings page works
- All settings functional
- Export/import works

---

### Step 4.7: Migrate Onboarding Feature
**Goal:** Move landing/onboarding to feature module

**Actions:**
1. Create `features/onboarding/components/`:
   - `SetupWizard.tsx`
   - `GenrePicker.tsx`

2. Create `features/onboarding/LandingPage.tsx`

3. Update router

**Verification:**
- Landing page works
- Onboarding flow works
- Setup data transfers correctly

---

## Phase 5: UI Components

### Step 5.1: Migrate UI Primitives
**Goal:** Move Radix UI components to `ui/primitives/`

**Actions:**
1. Move `src/components/ui/*` → `src/ui/primitives/`
2. Update imports throughout app

**Verification:**
- All components work
- No import errors

---

### Step 5.2: Create Layout Components
**Goal:** Organize layout components

**Actions:**
1. Move `src/components/Layout.tsx` → `src/ui/layout/AppLayout.tsx`
2. Move `src/components/ErrorBoundary.tsx` → `src/ui/layout/ErrorBoundary.tsx`
3. Create `src/ui/layout/Navigation.tsx` (extract from Layout)

**Verification:**
- Layout works
- Navigation works
- Error boundary works

---

### Step 5.3: Create Feedback Components
**Goal:** Create reusable feedback components

**Actions:**
1. Create `src/ui/feedback/LoadingSpinner.tsx`
2. Create `src/ui/feedback/EmptyState.tsx`
3. Create `src/ui/feedback/Toast.tsx`

**Verification:**
- Components work
- Used throughout app

---

## Phase 6: Cleanup

### Step 6.1: Remove Old Files
**Goal:** Delete deprecated files

**Actions:**
1. Delete `src/pages/` (except NotFound.tsx → move to ui/layout/)
2. Delete `src/components/` (except what's moved to ui/)
3. Delete `src/hooks/` (moved to features/)
4. Delete old `lib/` files (keep only what's still needed)

**Verification:**
- App still works
- No broken imports
- Build succeeds

---

### Step 6.2: Update Documentation
**Goal:** Document new structure

**Actions:**
1. Update README.md
2. Update inline comments
3. Create feature READMEs
4. Update architecture docs

**Verification:**
- Docs are accurate
- Examples work

---

### Step 6.3: Add Tests
**Goal:** Add tests for new structure

**Actions:**
1. Test domain services
2. Test repositories
3. Test providers
4. Test feature hooks
5. Test UI components

**Verification:**
- Tests pass
- Good coverage

---

## Rollback Strategy

If something goes wrong at any step:

1. **Revert Git Commit:** `git revert HEAD`
2. **Keep Old Code:** Don't delete until new code is verified
3. **Feature Flags:** Use flags to switch between old/new implementations
4. **Gradual Migration:** Migrate one feature at a time

## Success Criteria

- ✅ App works exactly as before
- ✅ All features functional
- ✅ No performance regression
- ✅ Code is more maintainable
- ✅ Easy to add new features
- ✅ Easy to add new media types
- ✅ Tests pass
- ✅ Documentation updated

## Timeline Estimate

- **Phase 1 (Foundation):** 2-3 days
- **Phase 2 (Domain):** 3-4 days
- **Phase 3 (Providers):** 2-3 days
- **Phase 4 (Features):** 5-7 days
- **Phase 5 (UI):** 2-3 days
- **Phase 6 (Cleanup):** 1-2 days

**Total:** 15-22 days (3-4 weeks)

## Tips

1. **Commit Often:** Small, atomic commits
2. **Test Continuously:** Verify after each step
3. **Document Changes:** Update docs as you go
4. **Ask for Help:** Review with team
5. **Take Breaks:** Don't rush
6. **Celebrate Progress:** Acknowledge milestones
