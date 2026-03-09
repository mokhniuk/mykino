# MyKino — Developer Reference (for Claude)

## Project Overview

**MyKino** is a privacy-first movie and TV show tracking PWA (Progressive Web App). Core philosophy: **local-first, offline-first** — no account required, all data lives in the browser's IndexedDB.

Optional enhancements: Supabase sync, Stripe billing, AI recommendations via a backend proxy.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| UI Components | Radix UI primitives + Lucide icons |
| Data Fetching | TanStack Query v5 (React Query) |
| Routing | React Router 6 |
| Local Storage | IndexedDB via `idb` |
| Forms | React Hook Form + Zod |
| PWA | vite-plugin-pwa (Workbox) |

### Backend (optional, `server/`)
| Layer | Technology |
|---|---|
| Framework | Hono (lightweight, Bun runtime) |
| Auth | Supabase |
| DB | Supabase PostgreSQL |
| Payments | Stripe |
| AI Providers | OpenAI, Anthropic, Gemini, Mistral, Ollama |

### External APIs
- **TMDB** — all movie/TV data (search, details, discovery, recommendations, providers)
- **api.country.is** — IP geolocation for streaming provider region

---

## File Map

```
/
├── src/
│   ├── App.tsx                # Router, global providers
│   ├── main.tsx               # Entrypoint, React root
│   ├── contexts/
│   │   └── AuthContext.tsx    # Supabase session, plan, sync trigger
│   ├── pages/                 # Route components (see routing section)
│   ├── components/
│   │   ├── Layout.tsx         # App shell (navbar, sidebar)
│   │   ├── MovieCard.tsx      # Grid/list movie card
│   │   ├── RecoCard.tsx       # AI recommendation card
│   │   ├── SearchResultCard.tsx
│   │   └── ui/               # Radix-based shadcn components
│   ├── hooks/
│   │   ├── useRecommendations.ts  # Home feed sections
│   │   ├── useProfile.ts          # Taste profile accessor
│   │   ├── useAchievements.ts     # Milestone badges
│   │   ├── useTVTracking.ts       # Episode tracker state
│   │   └── useTmdbMetadata.ts     # Genres, countries, languages
│   └── lib/
│       ├── db.ts              # IndexedDB schema + CRUD helpers
│       ├── supabase.ts        # Supabase client (optional)
│       ├── sync.ts            # IDB ↔ Supabase bi-directional sync
│       ├── api.ts             # Shared fetch helpers
│       ├── tmdb.ts            # TMDB API (movies)
│       ├── tmdbTV.ts          # TMDB API (TV shows)
│       ├── recommendations.ts # 6 home sections, filtering, scoring
│       ├── tasteProfile.ts    # Weighted genre/lang/country/era calc
│       ├── achievements.ts    # Top 100, directors, milestones
│       ├── tvTracking.ts      # Episode tracking state machine
│       ├── config.ts          # Runtime env vars (window.__ENV__)
│       ├── format.ts          # Date, duration, number formatters
│       ├── theme.tsx          # ThemeProvider (light/dark/system)
│       ├── top100.ts          # Hardcoded IMDb Top 100 list
│       ├── sw-update.ts       # Service worker update checker
│       └── ai/
│           ├── index.ts       # AI orchestration (proxy vs BYO key)
│           ├── types.ts       # AI interfaces
│           └── clients/       # Provider adapters
│               ├── anthropic.ts
│               ├── openai.ts
│               ├── gemini.ts
│               ├── mistral.ts
│               └── ollama.ts
├── server/
│   ├── index.ts               # Hono app, routes
│   └── lib/
│       ├── providers.ts       # AI provider selection + calls
│       ├── prompt.ts          # System prompt builder
│       ├── types.ts           # Shared server types
│       ├── stripe.ts          # Stripe webhook + checkout helpers
│       ├── supabaseAdmin.ts   # Supabase admin client
│       └── rateLimit.ts       # Free/pro rate limiting
├── supabase/
│   └── schema.sql             # DB schema + RLS policies
├── public/
│   └── config.js              # Injected by docker-entrypoint.sh
├── docs/                      # Architecture decision docs
└── CLAUDE.md                  # This file
```

---

## Routing

```
/                          Landing (onboarding/marketing)
/pricing                   Pricing page
/privacy, /terms, /contact Static pages

/app (Layout shell)
├── /app/                  Index — 6 recommendation sections
├── /app/search            Search (text, filters, AI)
├── /app/watchlist         Watchlist
├── /app/watched           Watch history
├── /app/favourites        Favorites
├── /app/movie/:id         Movie details + providers + AI recs
├── /app/tv/:id            TV show + episode tracker
├── /app/settings          Settings, data export/import, AI config
├── /app/section/:slug     Full section (infinite scroll)
├── /app/director/:slug    Director filmography
├── /app/achievements/top100              IMDb Top 100 challenge
├── /app/achievements/director/:slug      Director achievement detail
└── /app/achievements/milestones          Milestone badges
```

---

## IndexedDB Schema (`src/lib/db.ts`)

| Store | Key | Description |
|---|---|---|
| `movies` | `imdbID` | TMDB movie/TV cache (`m-{id}` / `tv-{id}` / `tt{imdb}`) |
| `watchlist` | `imdbID` | Movies/TV added to watch later |
| `watched` | `imdbID` | Watched items with `addedAt` timestamp |
| `favourites` | `imdbID` | Favorite items |
| `tv_tracking` | `tvId` | Episode-level progress per TV show |
| `settings` | `key` | JSON-encoded user prefs, taste profile, cache |
| `metadata` | `key` | Cached TMDB metadata (genres, countries, languages) |

**ID format:**
- Movies: `m-{tmdbId}` (e.g. `m-550`)
- TV shows: `tv-{tmdbId}` (e.g. `tv-1399`)
- IMDb passthrough: `tt0111161`

---

## Supabase Schema (optional sync/billing)

Tables: `profiles`, `watchlist`, `watched`, `favourites`, `tv_tracking`

- All tables have Row Level Security (RLS) — users see only their own data
- `profiles` auto-created on signup via trigger
- `profiles.plan`: `'free' | 'pro'`
- Sync is additive (no deletes propagated, no conflict overwriting)

---

## Environment Variables

### Frontend (`src/lib/config.ts` reads `window.__ENV__` or `import.meta.env`)
```
VITE_TMDB_API_KEY          # Required — TMDB v3 API key
VITE_AI_PROXY_URL          # Optional — backend URL for AI recommendations
VITE_SUPABASE_URL          # Optional — enables sync
VITE_SUPABASE_ANON_KEY     # Optional — enables sync
```

### Backend (`server/.env`)
```
PORT                       # Default 3001
COMMUNITY_MODE             # 'true' = no rate limits, no auth
ALLOWED_ORIGIN             # CORS allowed origin

# AI (one required for AI features)
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
MISTRAL_API_KEY
OLLAMA_BASE_URL
AI_MODEL                   # Override default model

# Stripe (optional)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_ANNUAL

# Supabase (required if using Stripe or plan checks)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Rate limiting
FREE_DAILY_LIMIT           # Default 3
PRO_DAILY_LIMIT            # Default 50
```

Runtime injection (Docker): `docker-entrypoint.sh` writes env vars to `public/config.js` as `window.__ENV__`.

---

## Core Systems

### Taste Profile (`src/lib/tasteProfile.ts`)

Calculates weighted preferences from user's library:
- Favourites × 3, Top-100 watched × 2, other watched × 1
- Outputs: top 5 genres, top 3 languages, top 3 countries, top 2 decades
- Cached 24h in IDB `settings` store, invalidated on library change

### Recommendation Scoring (`src/lib/recommendations.ts`)

`filterAndScore()` algorithm:
```
+5  Top genre match
+3  Other top-3 genres / top language match
+2  Top countries / top decade match / rating ≥7.0
+1  Other top languages / rating ≥6.0
+3  Explicitly liked genre
+2  Explicitly liked country / language
--- Exclude: disliked genre/country/language, already in watchlist/watched
```

**6 home sections:**
1. Because You Liked (favorites → TMDB recommendations + similar, daily seed)
2. By Genre (top 3 genres from taste profile)
3. Now Playing (current theatrical)
4. Trending (weekly, movies + TV)
5. Popular (all-time popular)
6. Hidden Gems (rating 7.5+, vote count 100–5000)

Recommendation cache: 24h per language key.

### AI Recommendations (`src/lib/ai/index.ts`)

Two modes:
1. **Managed proxy** (if `VITE_AI_PROXY_URL` set): frontend → `/api/ai/recommendations` → AI provider. Auth via Supabase token. Rate limited (free: 3/day, pro: unlimited).
2. **BYO key** (user sets API key in Settings): frontend calls AI directly.

AI prompt includes: watched exclusions, watchlist exclusions, taste profile, content preferences, top favorites. Expects JSON `{title, year, reason}[]`.

Cache: 2h per query in IDB.

### TV Tracking (`src/lib/tvTracking.ts`)

State machine: `planned → watching → completed`

Tracks per-season watched episodes as arrays. Progress excludes season 0 (specials).
Derives: next unwatched episode (S2E4 format), progress percentage, total watched count.

### Achievements (`src/lib/achievements.ts`)

- **Top 100**: IMDb top 100 hardcoded list, daily deterministic pick, reveal on watch
- **Directors**: Auto-group watched by director (2+ films = collection)
- **Milestones**: 8 badges (1, 10, 50, 100 films; classic era, world explorer, polyglot, genre master)

### Sync (`src/lib/sync.ts`)

- Mutation sync: `db:sync` custom event → upsert to Supabase (Pro users only)
- Full sync on login: push local → remote, then pull remote → local (additive merge)
- Exponential backoff on failure
- Web Locks API used to prevent concurrent auth flows

### Auth (`src/contexts/AuthContext.tsx`)

- Supabase magic link (passwordless)
- Plan refreshed every 5 minutes + tab visibility change
- Handles `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT` events
- Exposes: `user`, `accessToken`, `loading`, `syncing`, `triggerSync`

### TMDB API (`src/lib/tmdb.ts`, `src/lib/tmdbTV.ts`)

Language mapping (`ui lang → TMDB locale`):
- en → en-US, ua → uk-UA, de → de-DE, cs → cs-CZ, pl → pl-PL, pt → pt-BR
- hr/it → en-US (fallback — no TMDB support)

Cache-first: returns cached movie data if API fails.
Trailer fallback: if no trailer in user language, fetches English trailers.

---

## Deployment

### Docker (production)
```bash
# Frontend image with nginx
docker build -t mykino .
docker run -e VITE_TMDB_API_KEY=xxx -p 8080:80 mykino
```

`docker-entrypoint.sh` injects runtime env into `window.__ENV__` (allows single image, multiple configs).

### Local Development
```bash
# Frontend
npm install
npm run dev

# Backend (optional, Bun required)
cd server && bun install && bun dev
```

### Community (self-hosted, no backend)
- Only needs `VITE_TMDB_API_KEY`
- Users provide their own AI API keys in Settings
- No Supabase, no Stripe, no rate limiting

---

## i18n

8 languages in `src/lib/i18n/`: `en`, `ua`, `de`, `cs`, `pl`, `pt`, `hr`, `it`

Each language affects:
- UI strings (via i18n context)
- TMDB API locale parameter
- Separate recommendation cache key
- Separate metadata cache (genres, countries, languages)

---

## PWA

- Service worker via Workbox (vite-plugin-pwa)
- App shell: cache-first
- TMDB responses: network-first, 24h cache
- Images: cache-first, 30-day cache
- `start_url: /app` (keeps landing outside installed experience)
- Update check on startup + manual button in settings

---

## Testing

```bash
npm run test        # vitest
npm run test:ui     # vitest UI
npm run lint        # ESLint
npm run build       # TypeScript check + Vite build
```

Test setup: `src/test/setup.ts`, example in `src/test/example.test.ts`. Coverage is minimal — vitest is configured but not widely used yet.

---

## Known Architectural Notes

- IDB queries have no indexes → full-store scans for large libraries
- Recommendation cache is per-language, grows unbounded (no TTL eviction)
- No schema validation on IDB writes (opportunity for Zod)
- Sync is additive only — deletes do not propagate cross-device
- State management is React Context + React Query (no dedicated store like Zustand)
- `movies` store caches both partial (`_full: false`) and full (`_full: true`) TMDB responses
