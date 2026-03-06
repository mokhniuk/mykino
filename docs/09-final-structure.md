# Final Target Folder Structure

This document shows the complete target folder structure after refactoring.

## Complete Tree

```
mykino/
├── .git/
├── .vscode/
├── .claude/
├── dist/
├── node_modules/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192-maskable.png
│   ├── icon-512-maskable.png
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── robots.txt
│   └── .htaccess
├── scripts/
│   └── post-build.js
├── docs/                                    # 📚 NEW: Architecture documentation
│   ├── README.md
│   ├── 01-current-architecture.md
│   ├── 02-data-flow.md
│   ├── 03-storage-layer.md
│   ├── 04-external-apis.md
│   ├── 05-architectural-problems.md
│   ├── 06-target-architecture.md
│   ├── 07-domain-abstraction.md
│   ├── 08-refactoring-plan.md
│   └── 09-final-structure.md
├── src/
│   ├── core/                                # 🔧 NEW: Infrastructure layer
│   │   ├── ai/                             # AI integration
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── mistral.ts
│   │   │   │   └── ollama.ts
│   │   │   ├── AIClient.ts                # Abstract interface
│   │   │   ├── AIService.ts               # Recommendation service
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── config/                         # Configuration
│   │   │   ├── i18n.tsx                   # Moved from lib/
│   │   │   ├── theme.tsx                  # Moved from lib/
│   │   │   ├── constants.ts               # NEW: App constants
│   │   │   └── index.ts
│   │   ├── storage/                        # Storage abstraction
│   │   │   ├── IndexedDBAdapter.ts        # NEW: IDB implementation
│   │   │   ├── Repository.ts              # NEW: Generic repository
│   │   │   ├── migrations.ts              # NEW: Schema migrations
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── utils/                          # Shared utilities
│   │       ├── date.ts                    # NEW: Date utilities
│   │       ├── format.ts                  # Moved from lib/
│   │       ├── cache.ts                   # NEW: Cache manager
│   │       ├── validation.ts              # NEW: Zod schemas
│   │       └── index.ts
│   │
│   ├── domain/                              # 🎯 NEW: Domain layer
│   │   ├── models/                         # Domain entities
│   │   │   ├── MediaItem.ts               # NEW: Base interface
│   │   │   ├── Movie.ts                   # NEW: Movie model
│   │   │   ├── TVSeries.ts                # NEW: TV model
│   │   │   ├── Book.ts                    # NEW: Future book model
│   │   │   ├── Collection.ts              # NEW: Collection model
│   │   │   ├── TasteProfile.ts            # NEW: Taste profile model
│   │   │   ├── Achievement.ts             # NEW: Achievement model
│   │   │   └── index.ts
│   │   ├── services/                       # Domain services
│   │   │   ├── RecommendationService.ts   # NEW: From lib/recommendations.ts
│   │   │   ├── TasteProfileService.ts     # NEW: From lib/tasteProfile.ts
│   │   │   ├── AchievementService.ts      # NEW: From lib/achievements.ts
│   │   │   ├── CollectionService.ts       # NEW: Collection logic
│   │   │   └── index.ts
│   │   └── repositories/                   # Data access interfaces
│   │       ├── IMediaRepository.ts        # NEW: Media repo interface
│   │       ├── ICollectionRepository.ts   # NEW: Collection repo interface
│   │       ├── ISettingsRepository.ts     # NEW: Settings repo interface
│   │       └── index.ts
│   │
│   ├── providers/                           # 🔌 NEW: External data providers
│   │   ├── movies/                         # Movie provider
│   │   │   ├── TMDBProvider.ts            # NEW: From lib/tmdb.ts
│   │   │   ├── TMDBMapper.ts              # NEW: TMDB → Movie mapping
│   │   │   ├── TMDBTypes.ts               # NEW: TMDB-specific types
│   │   │   └── index.ts
│   │   ├── books/                          # Future: Books provider
│   │   │   ├── OpenLibraryProvider.ts
│   │   │   ├── OpenLibraryMapper.ts
│   │   │   └── index.ts
│   │   ├── IMediaProvider.ts               # NEW: Provider interface
│   │   └── index.ts
│   │
│   ├── features/                            # 🎨 NEW: Feature modules
│   │   ├── search/                         # Search & discovery
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx          # NEW: From SearchPage
│   │   │   │   ├── FilterPanel.tsx        # NEW: From SearchPage
│   │   │   │   ├── MoodChips.tsx          # NEW: From SearchPage
│   │   │   │   ├── ResultsList.tsx        # NEW: From SearchPage
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useSearch.ts           # NEW: Search logic
│   │   │   │   ├── useAISearch.ts         # NEW: AI search logic
│   │   │   │   └── index.ts
│   │   │   ├── SearchPage.tsx             # Refactored from pages/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── library/                        # Personal collections
│   │   │   ├── components/
│   │   │   │   ├── CollectionView.tsx     # NEW: Generic list view
│   │   │   │   ├── MediaCard.tsx          # Renamed from MovieCard
│   │   │   │   ├── FilterTabs.tsx         # NEW: Type filter
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useWatchlist.ts        # NEW: Watchlist logic
│   │   │   │   ├── useWatched.ts          # NEW: Watched logic
│   │   │   │   ├── useFavorites.ts        # NEW: Favorites logic
│   │   │   │   └── index.ts
│   │   │   ├── WatchlistPage.tsx          # Refactored from pages/
│   │   │   ├── WatchedPage.tsx            # Refactored from pages/
│   │   │   ├── FavoritesPage.tsx          # Refactored from pages/
│   │   │   └── index.ts
│   │   │
│   │   ├── details/                        # Media details
│   │   │   ├── components/
│   │   │   │   ├── MediaHeader.tsx        # NEW: From MovieDetailsPage
│   │   │   │   ├── MetadataSection.tsx    # NEW: From MovieDetailsPage
│   │   │   │   ├── ActionButtons.tsx      # NEW: From MovieDetailsPage
│   │   │   │   ├── TrailerPlayer.tsx      # NEW: From MovieDetailsPage
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useMediaDetails.ts     # NEW: Details logic
│   │   │   │   └── index.ts
│   │   │   ├── MovieDetailsPage.tsx       # Refactored from pages/
│   │   │   ├── TVShowPage.tsx             # Refactored from pages/
│   │   │   └── index.ts
│   │   │
│   │   ├── recommendations/                # Personalized recommendations
│   │   │   ├── components/
│   │   │   │   ├── RecommendationSection.tsx  # NEW: From Index
│   │   │   │   ├── SectionCard.tsx        # Renamed from RecoCard
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useRecommendations.ts  # Moved from hooks/
│   │   │   │   └── index.ts
│   │   │   ├── HomePage.tsx               # Renamed from Index
│   │   │   ├── SectionPage.tsx            # Renamed from RecoSectionPage
│   │   │   └── index.ts
│   │   │
│   │   ├── achievements/                   # Gamification
│   │   │   ├── components/
│   │   │   │   ├── Top100Grid.tsx         # NEW: From Top100Page
│   │   │   │   ├── DirectorCard.tsx       # NEW: From DirectorPage
│   │   │   │   ├── MilestoneCard.tsx      # NEW: From MilestonesPage
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAchievements.ts     # Moved from hooks/
│   │   │   │   └── index.ts
│   │   │   ├── Top100Page.tsx             # Refactored from pages/
│   │   │   ├── DirectorPage.tsx           # Refactored from pages/
│   │   │   ├── MilestonesPage.tsx         # Refactored from pages/
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/                       # App settings
│   │   │   ├── components/
│   │   │   │   ├── LanguageSelector.tsx   # NEW: From SettingsPage
│   │   │   │   ├── ThemeSelector.tsx      # NEW: From SettingsPage
│   │   │   │   ├── ContentPreferences.tsx # NEW: From SettingsPage
│   │   │   │   ├── AISettings.tsx         # NEW: From SettingsPage
│   │   │   │   ├── DataManagement.tsx     # NEW: From SettingsPage
│   │   │   │   └── index.ts
│   │   │   ├── SettingsPage.tsx           # Refactored from pages/
│   │   │   └── index.ts
│   │   │
│   │   └── onboarding/                     # First-run setup
│   │       ├── components/
│   │       │   ├── SetupWizard.tsx        # NEW: From Landing
│   │       │   ├── GenrePicker.tsx        # NEW: From Landing
│   │       │   └── index.ts
│   │       ├── LandingPage.tsx            # Refactored from pages/
│   │       └── index.ts
│   │
│   ├── ui/                                  # 🎨 NEW: Shared UI components
│   │   ├── primitives/                     # Radix UI wrappers
│   │   │   ├── accordion.tsx              # Moved from components/ui/
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── use-toast.ts
│   │   │   └── index.ts
│   │   ├── layout/                         # Layout components
│   │   │   ├── AppLayout.tsx              # Renamed from Layout
│   │   │   ├── Navigation.tsx             # NEW: From Layout
│   │   │   ├── ErrorBoundary.tsx          # Moved from components/
│   │   │   ├── NotFound.tsx               # Moved from pages/
│   │   │   └── index.ts
│   │   └── feedback/                       # Feedback components
│   │       ├── LoadingSpinner.tsx         # NEW
│   │       ├── EmptyState.tsx             # NEW
│   │       ├── Toast.tsx                  # NEW
│   │       └── index.ts
│   │
│   ├── types/                               # 📝 NEW: Global types
│   │   ├── index.ts                        # Re-exports
│   │   └── env.d.ts                        # Environment types
│   │
│   ├── App.tsx                              # Router & providers
│   ├── main.tsx                             # Entry point
│   ├── index.css                            # Global styles
│   └── vite-env.d.ts                        # Vite types
│
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── bun.lockb
├── components.json
├── Dockerfile
├── eslint.config.js
├── index.html
├── nginx.conf
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## File Count Comparison

### Before Refactoring
```
src/
├── components/     ~50 files (ui primitives + domain components)
├── hooks/          6 files
├── lib/            ~20 files (mixed concerns)
├── pages/          15 files
└── test/           2 files

Total: ~93 files
```

### After Refactoring
```
src/
├── core/           ~20 files (infrastructure)
├── domain/         ~15 files (models + services)
├── providers/      ~10 files (external integrations)
├── features/       ~80 files (7 features × ~12 files each)
├── ui/             ~50 files (shared components)
└── types/          2 files

Total: ~177 files
```

**Note:** More files, but better organized and easier to navigate.

## Key Differences

### Removed
- ❌ `src/components/` (split into `ui/` and feature components)
- ❌ `src/hooks/` (moved into features)
- ❌ `src/lib/` (split into `core/`, `domain/`, `providers/`)
- ❌ `src/pages/` (moved into features)

### Added
- ✅ `src/core/` (infrastructure layer)
- ✅ `src/domain/` (business logic layer)
- ✅ `src/providers/` (external integrations)
- ✅ `src/features/` (feature modules)
- ✅ `src/ui/` (shared UI components)
- ✅ `src/types/` (global types)
- ✅ `docs/` (architecture documentation)

## Import Path Examples

### Before
```typescript
import { getMovieDetails } from '@/lib/api';
import { getWatchlist } from '@/lib/db';
import { useRecommendations } from '@/hooks/useRecommendations';
import MovieCard from '@/components/MovieCard';
import { Button } from '@/components/ui/button';
```

### After
```typescript
import { TMDBProvider } from '@/providers/movies';
import { Repository } from '@/core/storage';
import { useRecommendations } from '@/features/recommendations/hooks';
import { MediaCard } from '@/features/library/components';
import { Button } from '@/ui/primitives';
```

## Benefits of New Structure

1. **Clear Separation:** Each layer has a specific purpose
2. **Feature Isolation:** Features are self-contained
3. **Reusability:** Core logic works for any media type
4. **Testability:** Easy to test each layer independently
5. **Scalability:** Easy to add new features and media types
6. **Maintainability:** Easy to find and modify code
7. **Documentation:** Architecture is self-documenting

## Migration Checklist

- [ ] Phase 1: Foundation (core infrastructure)
- [ ] Phase 2: Domain layer (models, services, repositories)
- [ ] Phase 3: Provider layer (TMDB provider)
- [ ] Phase 4: Feature migration (7 features)
- [ ] Phase 5: UI components (primitives, layout, feedback)
- [ ] Phase 6: Cleanup (remove old files, update docs)

## Next Steps

1. Review this structure with the team
2. Start Phase 1 of refactoring plan
3. Migrate one feature at a time
4. Test thoroughly after each phase
5. Update documentation as you go
6. Celebrate when complete! 🎉
