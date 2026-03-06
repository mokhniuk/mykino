# Architectural Problems

This document identifies the key architectural issues that should be addressed in the refactoring.

## 1. Mixed Concerns in lib/

### Problem
The `lib/` folder contains everything: API clients, business logic, storage, UI utilities (theme, i18n), and infrastructure code. There's no clear separation of concerns.

### Impact
- Hard to understand what belongs where
- Difficult to test in isolation
- Unclear dependencies between modules
- New developers struggle to navigate

### Examples
- `db.ts` (500+ lines) mixes storage operations, migrations, and cache management
- `i18n.tsx` is a React component but lives in `lib/`
- `theme.tsx` is a React component but lives in `lib/`
- `api.ts` is just a re-export, not a real abstraction

### Recommendation
Split into clear layers:
- `core/` - Infrastructure (storage, config, utils)
- `domain/` - Business logic (services, models)
- `providers/` - External integrations (TMDB, AI)
- `features/` - UI features with their own logic

---

## 2. Feature Logic Spread Across Folders

### Problem
A single feature (e.g., recommendations) has its code scattered across multiple folders:
- `lib/recommendations.ts` (core logic)
- `lib/tasteProfile.ts` (related logic)
- `hooks/useRecommendations.ts` (React integration)
- `pages/Index.tsx` (UI)
- `pages/RecoSectionPage.tsx` (more UI)

### Impact
- Hard to understand feature scope
- Changes require touching multiple folders
- Difficult to remove or refactor features
- No clear ownership

### Examples
**Recommendations Feature:**
- Logic: `lib/recommendations.ts`, `lib/tasteProfile.ts`
- Hooks: `hooks/useRecommendations.ts`
- UI: `pages/Index.tsx`, `pages/RecoSectionPage.tsx`, `components/RecoCard.tsx`

**Achievements Feature:**
- Logic: `lib/achievements.ts`, `lib/top100.ts`
- Hooks: `hooks/useAchievements.ts`
- UI: `pages/AchievementsTop100Page.tsx`, `pages/AchievementsDirectorPage.tsx`, `pages/AchievementsMilestonesPage.tsx`

### Recommendation
Organize by feature (vertical slices):
```
features/
  recommendations/
    components/
    hooks/
    services/
    RecommendationsPage.tsx
```

---

## 3. No Domain Separation

### Problem
Everything is movie-specific. There's no abstraction for "media items" that could be reused for books, music, or games.

### Impact
- Cannot reuse for other media types without major refactoring
- Duplicate logic would be needed for each new media type
- Hard to maintain consistency across media types

### Examples
- `MovieData` interface (should be `MediaItem`)
- `getMovieDetails()` function (should be `getMediaDetails()`)
- `MovieCard` component (should be `MediaCard`)
- `lib/tmdb.ts` tightly coupled to movies

### Recommendation
Introduce domain abstraction:
```typescript
interface MediaItem {
  id: string;
  type: 'movie' | 'tv' | 'book' | 'music' | 'game';
  title: string;
  // ... common fields
}

interface Movie extends MediaItem {
  type: 'movie';
  metadata: MovieMetadata;
}
```

---

## 4. Direct IndexedDB Calls Throughout

### Problem
While storage is centralized in `db.ts`, there's no repository pattern or abstraction. Functions directly call IndexedDB operations.

### Impact
- Hard to swap storage backend (e.g., to SQLite, cloud storage)
- Difficult to mock for testing
- No type safety for queries
- No validation on write

### Examples
```typescript
// Direct IndexedDB calls in db.ts
export async function addToWatchlist(movie: MovieData) {
  const db = await getDB();
  await db.put('watchlist', { ...movie, addedAt: Date.now() });
}
```

### Recommendation
Implement repository pattern:
```typescript
interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  add(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}

class Repository<T> implements IRepository<T> {
  constructor(private adapter: StorageAdapter, private storeName: string) {}
  // Implementation
}
```

---

## 5. API Logic Tightly Coupled to TMDB

### Problem
`lib/api.ts` is just a re-export of `lib/tmdb.ts`. There's no actual abstraction or interface.

### Impact
- Cannot easily add other movie data sources
- Cannot mock API for testing
- Cannot implement fallback providers
- Hard to add caching layer

### Example
```typescript
// lib/api.ts - Just a re-export
export { searchMovies, getMovieDetails } from './tmdb';
```

### Recommendation
Define provider interface:
```typescript
interface IMediaProvider<T extends MediaItem> {
  search(query: string): Promise<T[]>;
  getDetails(id: string): Promise<T | null>;
  getRecommendations(id: string): Promise<T[]>;
}

class TMDBProvider implements IMediaProvider<Movie> {
  // Implementation
}
```

---

## 6. Duplicate Logic

### Problem
Similar patterns are repeated across features without abstraction.

### Impact
- More code to maintain
- Inconsistent behavior
- Bugs need to be fixed in multiple places

### Examples

**Caching Logic:**
- Recommendations cache in `lib/recommendations.ts`
- Taste profile cache in `lib/tasteProfile.ts`
- Metadata cache in `lib/db.ts`
- All implement similar TTL logic differently

**Date-based Selection:**
- Daily pick in `lib/recommendations.ts::getDailySeed()`
- Daily Top 100 pick in `lib/achievements.ts::getDailyTop100Pick()`
- Both use same deterministic date hash algorithm

**Filter/Score Logic:**
- Recommendation scoring in `lib/recommendations.ts::scoreMovie()`
- AI result filtering in `SearchPage.tsx::doAISearch()`
- Similar logic, different implementations

### Recommendation
Extract common utilities:
```typescript
// core/utils/cache.ts
class CacheManager<T> {
  constructor(private key: string, private ttl: number) {}
  async get(): Promise<T | null> { /* ... */ }
  async set(value: T): Promise<void> { /* ... */ }
}

// core/utils/date.ts
function getDeterministicSelection<T>(items: T[], date: Date): T {
  const hash = hashDate(date);
  return items[hash % items.length];
}
```

---

## 7. Large Page Components

### Problem
Page components like `Index.tsx` (400+ lines) and `SearchPage.tsx` (800+ lines) do too much.

### Impact
- Hard to maintain and understand
- Difficult to test
- Poor performance (large component trees)
- Hard to reuse logic

### Examples

**SearchPage.tsx (800+ lines):**
- Search logic
- AI toggle and configuration
- Filter management
- Infinite scroll
- Mood chips
- Cache management
- Result rendering

**Index.tsx (400+ lines):**
- Multiple data fetches
- Recommendation sections
- Watchlist preview
- Favourites preview
- TV tracking
- Achievements preview
- Complex conditional rendering

### Recommendation
Break into smaller components:
```
features/search/
  components/
    SearchBar.tsx
    FilterPanel.tsx
    MoodChips.tsx
    ResultsList.tsx
    AIToggle.tsx
  hooks/
    useSearch.ts
    useAISearch.ts
  SearchPage.tsx (orchestrates components)
```

---

## 8. No Clear Data Layer

### Problem
Components directly call `lib/db.ts` and `lib/api.ts`. There's no single place to manage data fetching strategy, caching, or error handling.

### Impact
- Inconsistent data fetching patterns
- Some use React Query, others use useState + useEffect
- No centralized error handling
- Hard to implement optimistic updates

### Examples
```typescript
// Some components use React Query
const { data } = useQuery(['movie', id], () => getMovieDetails(id));

// Others use useState + useEffect
const [data, setData] = useState([]);
useEffect(() => {
  getWatchlist().then(setData);
}, []);
```

### Recommendation
Implement service layer:
```typescript
// domain/services/MovieService.ts
class MovieService {
  constructor(
    private provider: IMediaProvider<Movie>,
    private repository: IRepository<Movie>
  ) {}
  
  async search(query: string): Promise<Movie[]> {
    // Unified data fetching logic
  }
}
```

---

## 9. Type Definitions Scattered

### Problem
Types are defined inline in files where they're used, not in a central location.

### Impact
- Hard to find canonical type definitions
- Potential for type drift
- Difficult to share types across modules
- No single source of truth

### Examples
- `MovieData` in `lib/db.ts`
- `SearchResult` in `lib/tmdb.ts`
- `RecoSection` in `lib/recommendations.ts`
- `TVSeriesTracking` in `lib/tvTracking.ts`
- `AIRecommendation` in `lib/ai/types.ts`

### Recommendation
Centralize domain types:
```
domain/models/
  MediaItem.ts
  Movie.ts
  TVSeries.ts
  Collection.ts
  TasteProfile.ts
```

---

## 10. AI Integration Not Abstracted

### Problem
AI logic is mixed into `SearchPage.tsx` (800 lines) with complex filtering logic inline.

### Impact
- Hard to reuse AI recommendations elsewhere
- Difficult to test AI integration
- Cannot easily add AI to other features
- Complex component logic

### Example
```typescript
// SearchPage.tsx - 200+ lines of AI logic
const doAISearch = async (q: string, pageNum: number = 1) => {
  // Complex AI call
  // Complex filtering
  // Complex deduplication
  // Complex state management
};
```

### Recommendation
Extract to service:
```typescript
// domain/services/AIRecommendationService.ts
class AIRecommendationService {
  async getRecommendations(params: AIParams): Promise<MediaItem[]> {
    // Centralized AI logic
  }
}
```

---

## 11. No Validation Layer

### Problem
No schema validation on data writes or API responses.

### Impact
- Runtime errors from malformed data
- Hard to debug data issues
- No type safety at runtime
- Potential for data corruption

### Recommendation
Add validation with Zod:
```typescript
import { z } from 'zod';

const MovieSchema = z.object({
  imdbID: z.string(),
  Title: z.string(),
  Year: z.string(),
  // ...
});

export function validateMovie(data: unknown): Movie {
  return MovieSchema.parse(data);
}
```

---

## 12. No Error Boundaries

### Problem
Only one top-level error boundary. Errors in one feature crash the entire app.

### Impact
- Poor user experience
- Hard to debug production errors
- No graceful degradation

### Recommendation
Add feature-level error boundaries:
```typescript
<ErrorBoundary fallback={<FeatureError />}>
  <RecommendationsFeature />
</ErrorBoundary>
```

---

## 13. No Loading States Coordination

### Problem
Each component manages its own loading state independently.

### Impact
- Inconsistent loading UX
- Multiple spinners at once
- No skeleton screens
- Hard to implement global loading indicator

### Recommendation
Centralize loading state:
```typescript
// Use React Query's global loading state
const { isFetching } = useIsFetching();

// Or implement loading coordinator
const { startLoading, stopLoading } = useLoadingCoordinator();
```

---

## 14. No Optimistic Updates

### Problem
All mutations wait for database confirmation before updating UI.

### Impact
- Slow perceived performance
- Poor user experience
- Unnecessary loading states

### Recommendation
Implement optimistic updates:
```typescript
const mutation = useMutation({
  mutationFn: addToWatchlist,
  onMutate: async (movie) => {
    // Optimistically update UI
    queryClient.setQueryData(['watchlist'], old => [...old, movie]);
  },
  onError: (err, movie, context) => {
    // Rollback on error
    queryClient.setQueryData(['watchlist'], context.previousData);
  }
});
```

---

## Priority Matrix

| Problem | Impact | Effort | Priority |
|---------|--------|--------|----------|
| No domain separation | High | High | P0 |
| Feature logic spread | High | Medium | P0 |
| Mixed concerns in lib/ | High | Medium | P0 |
| Large page components | Medium | Low | P1 |
| No repository pattern | Medium | Medium | P1 |
| API tightly coupled | Medium | Medium | P1 |
| Duplicate logic | Medium | Low | P2 |
| Type definitions scattered | Low | Low | P2 |
| AI not abstracted | Medium | Low | P2 |
| No validation layer | Low | Medium | P3 |
| No error boundaries | Low | Low | P3 |
| No optimistic updates | Low | Medium | P3 |

**Priority Levels:**
- **P0:** Must fix for refactoring to succeed
- **P1:** Should fix for maintainability
- **P2:** Nice to have for code quality
- **P3:** Future improvements
