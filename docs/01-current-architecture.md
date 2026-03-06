# Current Architecture

## Repository Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/             # Radix UI primitives (45+ components)
│   ├── ErrorBoundary.tsx
│   ├── Layout.tsx
│   ├── MovieCard.tsx
│   ├── NavLink.tsx
│   ├── RecoCard.tsx
│   └── SearchResultCard.tsx
├── hooks/              # Custom React hooks
│   ├── useAchievements.ts
│   ├── useRecommendations.ts
│   ├── useTmdbMetadata.ts
│   ├── useTVTracking.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                # Core business logic
│   ├── ai/            # AI integration layer
│   │   ├── clients/   # Provider-specific clients
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   ├── mistral.ts
│   │   │   └── ollama.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── achievements.ts
│   ├── api.ts         # API abstraction layer
│   ├── db.ts          # IndexedDB operations
│   ├── format.ts
│   ├── i18n.tsx       # Internationalization
│   ├── recommendations.ts
│   ├── sw-update.ts
│   ├── tasteProfile.ts
│   ├── theme.tsx
│   ├── tmdb.ts        # TMDB API implementation
│   ├── tmdbTV.ts
│   ├── top100.ts
│   ├── tvTracking.ts
│   └── utils.ts
├── pages/              # Route components (15 pages)
│   ├── Index.tsx
│   ├── Landing.tsx
│   ├── SearchPage.tsx
│   ├── MovieDetailsPage.tsx
│   ├── TVShowPage.tsx
│   ├── WatchlistPage.tsx
│   ├── WatchedPage.tsx
│   ├── FavouritesPage.tsx
│   ├── SettingsPage.tsx
│   ├── RecoSectionPage.tsx
│   ├── DirectorPage.tsx
│   ├── AchievementsTop100Page.tsx
│   ├── AchievementsDirectorPage.tsx
│   ├── AchievementsMilestonesPage.tsx
│   └── NotFound.tsx
├── test/               # Test setup
├── App.tsx            # Router configuration
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Folder Purposes

### components/
Reusable UI components, heavily using Radix UI primitives. Contains both generic UI components (buttons, dialogs) and domain-specific components (MovieCard, RecoCard).

### hooks/
Custom React hooks for data fetching and state management. Provides abstraction over data operations for use in components.

### lib/
Core business logic, API integrations, storage, and utilities. This is the largest and most complex folder, containing everything from database operations to AI integration.

### pages/
Route-level components (one per URL path). These are the top-level components that compose features using hooks and components.

## Feature Map

### 1. Movie Search & Discovery
**Files:** `SearchPage.tsx`, `lib/api.ts`, `lib/tmdb.ts`

Features:
- TMDB multi-search with filters (genre, year, country)
- Discovery mode when filters active without query
- AI-powered recommendations via `lib/ai/`
- Infinite scroll pagination
- Client-side filtering when search query is active

### 2. Movie Details
**Files:** `MovieDetailsPage.tsx`, `TVShowPage.tsx`

Features:
- Full metadata display (cast, crew, ratings, trailer)
- Streaming provider availability by country
- Quick actions (watchlist, watched, favorites)
- YouTube trailer embedding
- Related movies/series

### 3. Personal Lists
**Files:** `WatchlistPage.tsx`, `WatchedPage.tsx`, `FavouritesPage.tsx`

Features:
- Three separate collections stored in IndexedDB
- Filter by type (movies/series)
- Sort by date added (descending)
- Quick actions on each item
- Empty states with CTAs

### 4. TV Episode Tracking
**Files:** `TVShowPage.tsx`, `lib/tvTracking.ts`, `hooks/useTVTracking.ts`

Features:
- Season-by-season episode toggles
- Progress tracking with status (watching/completed/planned)
- Next episode indicators (S2E4 format)
- Automatic status transitions
- Progress bars on cards

### 5. Personalized Recommendations
**Files:** `lib/recommendations.ts`, `lib/tasteProfile.ts`, `hooks/useRecommendations.ts`

Features:
- 6 auto-refreshing sections:
  - Because You Liked (based on daily seed from favorites)
  - By Genre (top genres from taste profile)
  - Now Playing (current theatrical releases)
  - Trending (weekly trends)
  - Popular (all-time popular)
  - Hidden Gems (high-rated, low vote count)
- Taste profile derived from watch history
- Content preferences (liked/disliked genres, countries, languages)
- 24h cache with invalidation
- Scoring algorithm based on taste profile
- Deduplication and filtering

### 6. Achievements System
**Files:** `lib/achievements.ts`, `hooks/useAchievements.ts`

Features:
- **Top 100 Challenge:** Work through IMDb Top 100 with daily picks
- **Director Collections:** Auto-grouped by director (2+ films)
- **8 Milestone badges:**
  - First Film
  - 10 Films
  - 50 Films
  - 100 Films
  - Classic Era (pre-1970)
  - World Explorer (5+ countries)
  - Polyglot (5+ languages)
  - Genre Master (10+ genres)

### 7. AI Advisor (Optional)
**Files:** `lib/ai/`, `SearchPage.tsx` (AI toggle)

Features:
- Multi-provider support (OpenAI, Anthropic, Gemini, Mistral, Ollama)
- Personalized recommendations based on taste profile
- Mood-based search chips (20+ moods)
- Exclusion of watched/watchlist items
- Content preference filtering
- Pagination support
- Reason display for each recommendation

### 8. Settings & Data Management
**Files:** `SettingsPage.tsx`

Features:
- Language selection (8 languages)
- Theme selection (light/dark/system)
- Content preferences management (liked/disliked genres, countries, languages)
- AI configuration (provider, API key, model)
- Export/Import JSON backups
- Database statistics
- Clear all data
- Update checker

### 9. Internationalization
**Files:** `lib/i18n.tsx`

Features:
- 8 languages: English, Ukrainian, German, Czech, Polish, Portuguese, Croatian, Italian
- Context-based translation system
- Language-specific TMDB API calls
- Persistent language preference

### 10. PWA & Offline Support
**Files:** `vite.config.ts`, `lib/sw-update.ts`

Features:
- Service worker with Workbox
- TMDB API caching (NetworkFirst, 24h)
- Image caching (CacheFirst, 30 days)
- Update checker with manual trigger
- Installable on home screen
- Offline functionality

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Primitives | Radix UI + Lucide Icons |
| Data Fetching | TanStack Query (React Query) |
| Routing | React Router 6 |
| Local Storage | IndexedDB via `idb` |
| Movie Data | TMDB API |
| AI (Optional) | OpenAI, Anthropic, Gemini, Mistral, Ollama |
| PWA | vite-plugin-pwa (Workbox) |
| Build Tool | Vite |

## Key Characteristics

- **Frontend-only:** No backend server
- **Local-first:** All data stored in IndexedDB
- **Privacy-focused:** No user accounts, no data sent to servers
- **Offline-capable:** Service worker caching
- **Multi-language:** 8 language support
- **Responsive:** Mobile-first design
- **Accessible:** Radix UI primitives
