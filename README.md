# MyKino

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**MyKino** is a private, offline-first movie and TV tracking app. No account, no server, no tracking — your data lives entirely in your browser. Discover what to watch next, track what you've seen, and build your taste profile over time.

---

## Features

### Discovery & Recommendations

- **Personalized home feed** with 6 auto-refreshing sections: _Because You Liked_, _By Genre_, _Now Playing_, _Trending_, _Popular_, and _Hidden Gems_
- **Taste profile** auto-derived from your watched history and favourites (top genres, languages, countries, decades) — used to score and rank every recommendation
- **Full-text search** with infinite scroll across the entire TMDB database
- **Discovery filters** — browse by genre, release year, or country without a search query
- **Infinite scroll section pages** — dive deeper into any recommendation section

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

### Onboarding

- **Landing page** with step-by-step setup: choose language → pick theme → rate genres (include / exclude / neutral cycling) → seed your watched history via search
- Setup data is encoded into a URL token when entering the app so settings are applied even if the browser and PWA storage contexts differ (Android shares storage automatically; iOS PWA users see a note explaining the limitation)

### Settings & Data

- **Language** — 6 fully localised languages: English, Українська, Deutsch, Čeština, Polski, Português
- **Theme** — Light / Dark / System (follows OS preference by default)
- **Content preferences** — fine-tune liked and disliked genres, countries, and languages; changes instantly invalidate the recommendation cache
- **Export / Import** — full JSON backup of all your data; native share sheet on mobile
- **Update checker** — in-app button to check for and apply PWA updates

### Privacy & Tech

- **No account, no sign-up** — the app works without any authentication
- **All data on-device** — watchlist, history, favourites, and settings live in IndexedDB; nothing is sent to a server
- **Works offline** — service worker caches the app shell and TMDB responses
- **Transparent analytics** — only anonymous page-view counts via [Umami](https://umami.mokhni.uk/share/fH4J4yX37j8uuyU7) (public dashboard)
- **PWA** — installable on home screen on iOS and Android; `start_url` is `/app` so the marketing landing page stays out of the installed experience

---

## Tech Stack

| Layer                   | Choice                       |
| ----------------------- | ---------------------------- |
| Framework               | React 18 + Vite              |
| Language                | TypeScript                   |
| Styling                 | Tailwind CSS                 |
| UI primitives           | Radix UI + Lucide Icons      |
| Data fetching & caching | TanStack Query (React Query) |
| Routing                 | React Router 6               |
| Local storage           | IndexedDB via `idb`          |
| Movie / TV data         | TMDB API                     |
| PWA                     | vite-plugin-pwa (Workbox)    |
| Analytics               | Umami (self-hosted)          |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Bun](https://bun.sh/) (recommended) or npm

### Installation

```bash
git clone https://github.com/mokhniuk/mykino.git
cd mykino
bun install          # or: npm install
```

Create a `.env` file with your TMDB API key:

```
VITE_TMDB_API_KEY=your_key_here
```

### Development

```bash
bun dev              # or: npm run dev
```

### Production build

```bash
bun run build        # or: npm run build
```

---

## Docker

```bash
docker build -t mykino .
docker run -d -p 8080:80 mykino
# → http://localhost:8080
```

---

## Project Structure

```
src/
├── components/       # Shared UI (Layout, RecoCard, …)
├── hooks/            # useRecommendations, useAchievements, useTVTracking, …
├── lib/              # Core logic: db, i18n, theme, api, recommendations,
│                     #   tasteProfile, achievements, tvTracking
├── pages/            # One file per route
│   ├── Landing.tsx               # Onboarding & marketing
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
```

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">Built with care by <a href="https://mokhniuk.online">Oleg Mokhniuk</a></p>
