# MyKino

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**MyKino** is a private, offline-first movie and TV tracking app. No account required — your data lives entirely in your browser. Discover what to watch next, track what you've seen, get AI-powered recommendations, and optionally sync across devices with a free account.

---

## Features

### Discovery & Recommendations

- **Personalized home feed** with 6 auto-refreshing sections: _Because You Liked_, _By Genre_, _Now Playing_, _Trending_, _Popular_, and _Hidden Gems_
- **Taste profile** auto-derived from your watched history and favourites (top genres, languages, countries, decades) — used to score and rank every recommendation
- **Full-text search** with infinite scroll across the entire TMDB database; search by title, director, or actor
- **Discovery filters** — browse by genre, release year, or country without a search query
- **Infinite scroll section pages** — dive deeper into any recommendation section

### AI Advisor

- **Context-aware recommendations** — ask for picks in natural language (e.g. "something slow-burn and eerie")
- **Mood chips** — one-tap quick-start prompts for 20+ moods
- **Managed mode** — 30 AI calls/month with a free account; 50/day on Pro
- **BYO key mode** — connect your own OpenAI, Anthropic, Google Gemini, Mistral, or local Ollama key for unlimited calls

### Tracking

- **Watchlist** — save movies and series to watch later; filter by type (movies / series)
- **Watched history** — log everything you've seen; filter and browse your full history
- **Favourites** — curate an all-time best list separate from your watchlist
- **TV episode tracking** — season-by-season episode toggles with progress bars, next-episode indicators (`S2E4`), and automatic status transitions (planned → watching → completed)

### Movie & Series Details

- Full details page with backdrop, poster, IMDb rating, runtime, plot, director, cast, writers, genre, language, country, awards, and box office
- Embedded YouTube trailer
- **Streaming providers by country** — pick your country from a dropdown to see where to watch
- Quick-action buttons: add to watchlist, mark watched, toggle favourite

### Achievements

- **Top 100 Challenge** — work through the IMDb Top 100; posters reveal as you watch them. Daily pick and shuffle button to guide your next choice
- **Director Collections** — automatically groups your watched films by director; shows what else each director has made
- **8 Milestone badges**: First Film · 10 Films · 50 Films · 100 Films · Classic Era · World Explorer · Polyglot · Genre Master

### Accounts & Sync

- **Optional free account** — sign in via magic link (email) to unlock cloud sync and managed AI
- **Cross-device sync** — watchlist, watched, favourites, and settings sync automatically via Supabase
- **Pro plan** — 50 AI calls/day + priority support (€4.99/month or €39/year via Stripe)

### Marketing & Legal Pages

- **Landing page** — step-by-step onboarding: choose language → pick theme → rate genres → seed watch history
- **Pricing page** — transparent plan comparison (Demo / Free / Pro / Community)
- **Community page** — self-hosting guide with Docker quick-start and environment variable reference
- **Legal pages** — Privacy Policy, Terms of Service, and Contact
- All marketing/legal pages are **SSG pre-rendered in all 9 languages** for SEO

### Settings & Data

- **Language** — 9 fully localised interfaces: English, Українська, Deutsch, Čeština, Polski, Português, Hrvatski, Italiano, Español
- **Theme** — Light / Dark / System (follows OS preference by default)
- **Content preferences** — fine-tune liked and disliked genres, countries, and languages; changes instantly invalidate the recommendation cache
- **Export / Import** — full JSON backup of all your data; native share sheet on mobile
- **Update checker** — in-app button to check for and apply PWA updates

### Privacy & Tech

- **No account required** — the app works fully without authentication
- **All data on-device** — watchlist, history, favourites, and settings live in IndexedDB; nothing leaves your device unless you opt in to sync
- **Works offline** — service worker caches the app shell and TMDB responses
- **Transparent analytics** — only anonymous page-view counts via [Umami](https://umami.mokhni.uk/share/fH4J4yX37j8uuyU7) (public dashboard)
- **PWA** — installable on home screen on iOS and Android; `start_url` is `/app` so the marketing landing page stays out of the installed experience

---

## Tech Stack

| Layer                   | Choice                        |
| ----------------------- | ----------------------------- |
| Framework               | React 18 + Vite               |
| Language                | TypeScript                    |
| Styling                 | Tailwind CSS                  |
| UI primitives           | Radix UI + Lucide Icons       |
| Data fetching & caching | TanStack Query (React Query)  |
| Routing                 | React Router 6                |
| Local storage           | IndexedDB via `idb`           |
| Movie / TV data         | TMDB API                      |
| Auth & sync             | Supabase (optional)           |
| Payments                | Stripe                        |
| PWA                     | vite-plugin-pwa (Workbox)     |
| Analytics               | Umami (self-hosted)           |
| Build / scripts runtime | Bun                           |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (or [Bun](https://bun.sh/))
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Installation

```bash
git clone https://github.com/mokhniuk/mykino.git
cd mykino
bun install          # or: npm install
```

Create a `.env` file (see `.env.example` for all options):

```env
VITE_TMDB_API_KEY=your_key_here
```

### Development

```bash
bun dev              # or: npm run dev
```

### Production build

```bash
bun run build        # version bump + Vite build + SSG post-processing
# or, skip the version bump:
bun run build:static
```

The post-build script generates pre-rendered static HTML for all marketing and legal pages in all 9 languages (e.g. `dist/ua/pricing/index.html`).

---

## Docker

A single image includes the React SPA, an Express AI proxy, and Nginx.

```bash
docker build -t mykino .
docker run -d -p 8080:80 \
  -e VITE_TMDB_API_KEY=your_key \
  mykino
# → http://localhost:8080
```

See `.env.example` for all available environment variables (AI provider keys, Supabase credentials, etc.).

---

## Project Structure

```
src/
├── components/       # Shared UI (Layout, RecoCard, Footer, …)
├── contexts/         # AuthContext (Supabase auth)
├── hooks/            # useRecommendations, useProfile, useTVTracking, …
├── lib/
│   ├── i18n/         # Translation files for 9 languages
│   ├── ai/           # AI provider adapters (OpenAI, Anthropic, Gemini, …)
│   ├── db.ts         # IndexedDB helpers via idb
│   ├── tmdb.ts       # TMDB API client
│   ├── recommendations.ts
│   ├── tasteProfile.ts
│   └── …
├── pages/
│   ├── Landing.tsx               # Onboarding & marketing
│   ├── Pricing.tsx               # Plan comparison
│   ├── Community.tsx             # Self-hosting guide
│   ├── Privacy.tsx               # Privacy policy
│   ├── Terms.tsx                 # Terms of service
│   ├── Contact.tsx               # Contact page
│   ├── Index.tsx                 # Home feed
│   ├── SearchPage.tsx            # Search & discovery
│   ├── MovieDetailsPage.tsx      # Movie / series detail
│   ├── TVShowPage.tsx            # TV episode tracker
│   ├── WatchlistPage.tsx
│   ├── FavouritesPage.tsx
│   ├── WatchedPage.tsx
│   ├── RecoSectionPage.tsx       # Full section with infinite scroll
│   ├── SettingsPage.tsx
│   ├── DirectorPage.tsx
│   ├── AchievementsTop100Page.tsx
│   ├── AchievementsDirectorPage.tsx
│   └── AchievementsMilestonesPage.tsx
└── App.tsx           # Router root

scripts/
├── post-build.js     # SSG: generates localized static pages for all 9 languages
└── version-bump.js   # Auto-increments package.json version

server/               # Express AI proxy (used in Docker / self-hosted mode)
```

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">Built with care by <a href="https://mokhniuk.online">Oleg Mokhniuk</a></p>
