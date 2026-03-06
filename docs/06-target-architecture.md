# Target Architecture

This document describes the proposed architecture that addresses the identified problems and enables future expansion.

## Design Principles

1. **Separation of Concerns:** Clear boundaries between layers
2. **Domain-Driven Design:** Business logic independent of infrastructure
3. **Dependency Inversion:** Depend on abstractions, not implementations
4. **Feature-Based Organization:** Vertical slices for features
5. **Reusability:** Core logic reusable across media types
6. **Testability:** Easy to test in isolation
7. **Maintainability:** Easy to understand and modify

## Proposed Folder Structure

```
src/
├── core/                          # Domain-agnostic infrastructure
│   ├── ai/                       # AI integration
│   │   ├── providers/           # Provider implementations
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   ├── mistral.ts
│   │   │   └── ollama.ts
│   │   ├── AIClient.ts          # Abstract interface
│   │   ├── AIService.ts         # Recommendation service
│   │   └── types.ts
│   ├── config/                   # App configuration
│   │   ├── i18n.ts              # Translation system
│   │   ├── theme.ts             # Theme management
│   │   └── constants.ts
│   ├── storage/                  # Storage abstraction
│   │   ├── IndexedDBAdapter.ts  # IDB implementation
│   │   ├── Repository.ts        # Generic repository
│   │   ├── migrations.ts        # Schema migrations
│   │   └── types.ts
│   └── utils/                    # Shared utilities
│       ├── date.ts
│       ├── format.ts
│       ├── cache.ts
│       └── validation.ts
│
├── domain/                        # Domain models & logic
│   ├── models/                   # Domain entities
│   │   ├── MediaItem.ts         # Base media interface
│   │   ├── Movie.ts             # Movie extends MediaItem
│   │   ├── TVSeries.ts          # TV extends MediaItem
│   │   ├── Book.ts              # Future: Book extends MediaItem
│   │   ├── Collection.ts        # Watchlist, Watched, Favorites
│   │   ├── TasteProfile.ts
│   │   └── Achievement.ts
│   ├── services/                 # Domain services
│   │   ├── RecommendationService.ts
│   │   ├── TasteProfileService.ts
│   │   ├── AchievementService.ts
│   │   └── CollectionService.ts
│   └── repositories/             # Data access interfaces
│       ├── IMediaRepository.ts
│       ├── ICollectionRepository.ts
│       └── ISettingsRepository.ts
│
├── providers/                     # External data providers
│   ├── movies/                   # Movie-specific provider
│   │   ├── TMDBProvider.ts      # TMDB implementation
│   │   ├── TMDBMapper.ts        # TMDB → Movie mapping
│   │   ├── TMDBTypes.ts
│   │   └── index.ts
│   ├── books/                    # Future: Books provider
│   │   └── OpenLibraryProvider.ts
│   └── IMediaProvider.ts         # Provider interface
│
├── features/                      # Feature modules
│   ├── search/                   # Search & discovery
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── MoodChips.tsx
│   │   │   └── ResultsList.tsx
│   │   ├── hooks/
│   │   │   ├── useSearch.ts
│   │   │   └── useAISearch.ts
│   │   ├── SearchPage.tsx
│   │   └── types.ts
│   ├── library/                  # Personal collections
│   │   ├── components/
│   │   │   ├── CollectionView.tsx
│   │   │   ├── MediaCard.tsx
│   │   │   └── FilterTabs.tsx
│   │   ├── hooks/
│   │   │   ├── useWatchlist.ts
│   │   │   ├── useWatched.ts
│   │   │   └── useFavorites.ts
│   │   ├── WatchlistPage.tsx
│   │   ├── WatchedPage.tsx
│   │   └── FavoritesPage.tsx
│   ├── details/                  # Media details
│   │   ├── components/
│   │   │   ├── MediaHeader.tsx
│   │   │   ├── MetadataSection.tsx
│   │   │   ├── ActionButtons.tsx
│   │   │   └── TrailerPlayer.tsx
│   │   ├── hooks/
│   │   │   └── useMediaDetails.ts
│   │   ├── MovieDetailsPage.tsx
│   │   └── TVShowPage.tsx
│   ├── recommendations/          # Personalized recs
│   │   ├── components/
│   │   │   ├── RecommendationSection.tsx
│   │   │   └── SectionCard.tsx
│   │   ├── hooks/
│   │   │   └── useRecommendations.ts
│   │   ├── HomePage.tsx
│   │   └── SectionPage.tsx
│   ├── achievements/             # Gamification
│   │   ├── components/
│   │   │   ├── Top100Grid.tsx
│   │   │   ├── DirectorCard.tsx
│   │   │   └── MilestoneCard.tsx
│   │   ├── hooks/
│   │   │   └── useAchievements.ts
│   │   ├── Top100Page.tsx
│   │   ├── DirectorPage.tsx
│   │   └── MilestonesPage.tsx
│   ├── settings/                 # App settings
│   │   ├── components/
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── ContentPreferences.tsx
│   │   │   ├── AISettings.tsx
│   │   │   └── DataManagement.tsx
│   │   └── SettingsPage.tsx
│   └── onboarding/               # First-run setup
│       ├── components/
│       │   ├── SetupWizard.tsx
│       │   └── GenrePicker.tsx
│       └── LandingPage.tsx
│
├── ui/                            # Shared UI components
│   ├── primitives/               # Radix UI wrappers
│   │   ├── Button.tsx
│   │   ├── Dialog.tsx
│   │   ├── Select.tsx
│   │   └── ... (45+ components)
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Navigation.tsx
│   │   └── ErrorBoundary.tsx
│   └── feedback/
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       └── Toast.tsx
│
├── App.tsx                        # Router & providers
├── main.tsx                       # Entry point
└── types/                         # Global type definitions
    ├── index.ts
    └── env.d.ts
```

## Layer Responsibilities

### core/
**Purpose:** Framework-agnostic business logic and infrastructure

**Characteristics:**
- No React dependencies
- Reusable across different UIs (web, mobile, desktop)
- Pure TypeScript/JavaScript
- Testable without DOM

**Contains:**
- AI integration layer
- Storage abstraction
- Configuration management
- Shared utilities

**Example:**
```typescript
// core/storage/Repository.ts
export class Repository<T extends { id: string }> {
  constructor(
    private adapter: StorageAdapter,
    private storeName: string
  ) {}
  
  async getAll(): Promise<T[]> {
    return this.adapter.getAll<T>(this.storeName);
  }
}
```

---

### domain/
**Purpose:** Domain models and business rules

**Characteristics:**
- Pure TypeScript classes/interfaces
- No external dependencies (except types)
- Framework-agnostic
- Business logic only

**Contains:**
- Entity definitions (MediaItem, Movie, TVSeries, etc.)
- Domain services (RecommendationService, TasteProfileService)
- Repository interfaces (IMediaRepository, ICollectionRepository)

**Example:**
```typescript
// domain/services/RecommendationService.ts
export class RecommendationService<T extends MediaItem> {
  constructor(
    private provider: IMediaProvider<T>,
    private tasteProfileService: TasteProfileService
  ) {}
  
  async getPersonalizedRecommendations(): Promise<T[]> {
    const profile = await this.tasteProfileService.getProfile();
    const recommendations = await this.provider.getRecommendations();
    return this.scoreAndFilter(recommendations, profile);
  }
}
```

---

### providers/
**Purpose:** External data source integrations

**Characteristics:**
- Implements `IMediaProvider` interface
- Maps external APIs to domain models
- Isolated from UI and business logic
- Swappable implementations

**Contains:**
- TMDB provider for movies
- Future: OpenLibrary provider for books
- Future: Spotify provider for music

**Example:**
```typescript
// providers/movies/TMDBProvider.ts
export class TMDBProvider implements IMediaProvider<Movie> {
  async search(query: string): Promise<Movie[]> {
    const data = await this.tmdbFetch(`/search/multi?query=${query}`);
    return data.results.map(this.mapToMovie);
  }
  
  private mapToMovie(tmdbData: any): Movie {
    return {
      id: `m-${tmdbData.id}`,
      type: 'movie',
      title: tmdbData.title,
      // ... mapping logic
    };
  }
}
```

---

### features/
**Purpose:** Feature-based modules (vertical slices)

**Characteristics:**
- Self-contained features
- Contains: pages, components, hooks, types
- Can import from: core, domain, providers, ui
- Cannot import from other features

**Contains:**
- Search & discovery
- Personal library (watchlist, watched, favorites)
- Media details
- Recommendations
- Achievements
- Settings
- Onboarding

**Example:**
```
features/search/
  components/
    SearchBar.tsx          # Search input
    FilterPanel.tsx        # Genre/year/country filters
    MoodChips.tsx          # AI mood suggestions
    ResultsList.tsx        # Search results display
  hooks/
    useSearch.ts           # Search logic
    useAISearch.ts         # AI search logic
  SearchPage.tsx           # Main page component
  types.ts                 # Feature-specific types
```

---

### ui/
**Purpose:** Shared UI components

**Characteristics:**
- Presentational components only
- No business logic
- Reusable across features
- Styled with Tailwind CSS

**Contains:**
- Radix UI primitive wrappers
- Layout components
- Feedback components (loading, empty states, toasts)

**Example:**
```typescript
// ui/feedback/EmptyState.tsx
export function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
```

---

## Dependency Flow

```
┌─────────────────────────────────────────┐
│              features/                   │
│  (Search, Library, Details, etc.)       │
└────────────┬────────────────────────────┘
             │ imports
             ↓
┌────────────┴────────────────────────────┐
│         domain/services/                 │
│  (RecommendationService, etc.)          │
└────────────┬────────────────────────────┘
             │ uses
             ↓
┌────────────┴────────────────────────────┐
│       domain/repositories/               │
│  (IMediaRepository interfaces)          │
└────────────┬────────────────────────────┘
             │ implemented by
             ↓
┌────────────┴────────────────────────────┐
│         core/storage/                    │
│  (Repository, IndexedDBAdapter)         │
└──────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         domain/services/                 │
└────────────┬────────────────────────────┘
             │ uses
             ↓
┌────────────┴────────────────────────────┐
│         providers/                       │
│  (TMDBProvider, IMediaProvider)         │
└──────────────────────────────────────────┘
```

**Rules:**
- Features can import from: core, domain, providers, ui
- Domain can import from: core (utilities only)
- Providers can import from: domain (models only), core
- Core has no dependencies (except external libraries)
- UI has no dependencies (except external libraries)

---

## Key Patterns

### 1. Repository Pattern
Abstracts data access:
```typescript
interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  add(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}
```

### 2. Provider Pattern
Abstracts external data sources:
```typescript
interface IMediaProvider<T extends MediaItem> {
  search(query: string): Promise<T[]>;
  getDetails(id: string): Promise<T | null>;
  getRecommendations(id: string): Promise<T[]>;
}
```

### 3. Service Layer
Encapsulates business logic:
```typescript
class RecommendationService<T extends MediaItem> {
  constructor(
    private provider: IMediaProvider<T>,
    private repository: IRepository<T>
  ) {}
  
  async getPersonalizedRecommendations(): Promise<T[]> {
    // Business logic
  }
}
```

### 4. Feature Modules
Self-contained vertical slices:
```
features/search/
  components/     # Feature-specific UI
  hooks/          # Feature-specific hooks
  SearchPage.tsx  # Main page
  types.ts        # Feature types
```

---

## Benefits

### 1. Maintainability
- Clear separation of concerns
- Easy to find code
- Easy to understand dependencies
- Easy to modify without breaking other parts

### 2. Testability
- Pure functions easy to test
- Mock dependencies via interfaces
- Test business logic without UI
- Test UI without business logic

### 3. Reusability
- Core logic reusable across media types
- UI components reusable across features
- Services reusable across features
- Providers swappable

### 4. Scalability
- Easy to add new features
- Easy to add new media types
- Easy to add new providers
- Easy to add new storage backends

### 5. Team Collaboration
- Clear ownership boundaries
- Parallel development possible
- Less merge conflicts
- Easier code reviews

---

## Migration Strategy

The refactoring will be done incrementally to keep the app working:

1. **Phase 1:** Create new structure alongside old
2. **Phase 2:** Migrate core utilities and storage
3. **Phase 3:** Migrate domain models and services
4. **Phase 4:** Migrate providers
5. **Phase 5:** Migrate features one by one
6. **Phase 6:** Remove old structure

See [08-refactoring-plan.md](./08-refactoring-plan.md) for detailed steps.
