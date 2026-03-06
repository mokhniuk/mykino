# External APIs

## 1. TMDB (The Movie Database)

### Overview
- **Purpose:** Movie/TV metadata, search, recommendations
- **Location:** `lib/tmdb.ts`
- **Base URL:** `https://api.themoviedb.org/3`
- **Authentication:** API key via `VITE_TMDB_API_KEY` environment variable
- **Rate Limiting:** 40 requests per 10 seconds (not enforced in code)

### Language Support
```typescript
const TMDB_LANG: Record<string, string> = {
  en: 'en-US',
  ua: 'uk-UA',
  de: 'de-DE',
  cs: 'cs-CZ',
  pl: 'pl-PL',
  pt: 'pt-BR',
};
```

### Endpoints Used

#### Search
```typescript
// Multi-search (movies, TV, people)
GET /search/multi?query={query}&page={page}&include_adult=false

// Specific searches
GET /search/movie?query={query}&page={page}&include_adult=false
GET /search/tv?query={query}&page={page}&include_adult=false
GET /search/person?query={query}&include_adult=false
```

#### Details
```typescript
// Movie details with credits and videos
GET /movie/{id}?append_to_response=credits,videos

// TV details with credits and videos
GET /tv/{id}?append_to_response=credits,videos

// IMDb ID lookup
GET /find/{imdb_id}?external_source=imdb_id
```

#### Recommendations & Similar
```typescript
GET /movie/{id}/recommendations?page={page}
GET /tv/{id}/recommendations?page={page}
GET /movie/{id}/similar?page={page}
GET /tv/{id}/similar?page={page}
```

#### Trending & Popular
```typescript
GET /trending/movie/week?page={page}
GET /trending/tv/week?page={page}
GET /movie/now_playing?page={page}
GET /movie/popular?page={page}
GET /tv/popular?page={page}
```

#### Discovery
```typescript
GET /discover/movie?{filters}
GET /discover/tv?{filters}

// Common filters:
// - with_genres={genre_ids}
// - without_genres={genre_ids}
// - primary_release_year={year}
// - first_air_date_year={year}
// - with_origin_country={country_code}
// - without_origin_country={country_code}
// - with_original_language={language_code}
// - without_original_language={language_code}
// - vote_average.gte={rating}
// - vote_count.gte={count}
// - vote_count.lte={count}
// - sort_by={sort_option}
```

#### Metadata
```typescript
GET /genre/movie/list
GET /genre/tv/list
GET /configuration/countries
GET /configuration/languages
```

#### Watch Providers
```typescript
GET /movie/{id}/watch/providers
GET /tv/{id}/watch/providers
```

#### Person Credits
```typescript
GET /person/{id}/movie_credits
```

### Response Caching

**Service Worker Strategy:**
```javascript
// API responses: NetworkFirst with 10s timeout, 24h cache
{
  urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "tmdb-api",
    networkTimeoutSeconds: 10,
    expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
  },
}

// Images: CacheFirst, 30-day cache
{
  urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
  handler: "CacheFirst",
  options: {
    cacheName: "tmdb-images",
    expiration: { maxEntries: 300, maxAgeSeconds: 2592000 },
  },
}
```

### Data Mapping

**TMDB → MovieData:**
```typescript
function mapMovieDetail(data: TmdbMovieDetail, storeId: string): MovieData {
  return {
    imdbID: storeId,
    Title: data.title,
    OriginalTitle: data.original_title !== data.title ? data.original_title : undefined,
    Year: data.release_date?.slice(0, 4) ?? '',
    Poster: posterUrl(data.poster_path),
    Type: 'movie',
    Plot: data.overview || undefined,
    Genre: data.genres?.map(g => g.name).join(', ') || undefined,
    Runtime: data.runtime ? `${data.runtime} min` : undefined,
    imdbRating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
    imdbVotes: data.vote_count ? String(data.vote_count) : undefined,
    Director: mapCredits(data.credits).director,
    Writer: mapCredits(data.credits).writer,
    Actors: mapCredits(data.credits).actors,
    Language: data.spoken_languages?.map(l => l.english_name).join(', ') || undefined,
    Country: data.production_countries?.map(c => c.name).join(', ') || undefined,
    Released: data.release_date || undefined,
    BoxOffice: data.revenue ? `${data.revenue.toLocaleString()}` : undefined,
    TrailerKey: getBestTrailer(data.videos),
    genre_ids: data.genres?.map(g => g.id),
    original_language: data.original_language,
    origin_country: data.production_countries?.map(c => c.iso_3166_1),
  };
}
```

### Error Handling
- Network errors caught and returned as `{ Response: 'False', Error: string }`
- Fallback to cached data when available
- Graceful degradation (e.g., no trailer → hide player)

---

## 2. AI Providers (Optional)

### Overview
- **Purpose:** Personalized movie recommendations
- **Location:** `lib/ai/clients/`
- **Configuration:** Stored in IndexedDB settings
- **User Control:** Fully optional, user provides API keys

### Supported Providers

#### OpenAI
**File:** `lib/ai/clients/openai.ts`  
**API:** `https://api.openai.com/v1/chat/completions`  
**Default Model:** `gpt-4o-mini`  
**Authentication:** Bearer token (API key)

```typescript
{
  model: config.model || 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  response_format: { type: 'json_object' },
  temperature: 0.7
}
```

#### Anthropic (Claude)
**File:** `lib/ai/clients/anthropic.ts`  
**API:** `https://api.anthropic.com/v1/messages`  
**Default Model:** `claude-3-5-sonnet-20241022`  
**Authentication:** `x-api-key` header

```typescript
{
  model: config.model || 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  messages: [
    { role: 'user', content: combinedPrompt }
  ],
  temperature: 0.7
}
```

#### Google Gemini
**File:** `lib/ai/clients/gemini.ts`  
**API:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`  
**Default Model:** `gemini-1.5-flash`  
**Authentication:** API key in URL

```typescript
{
  contents: [
    { role: 'user', parts: [{ text: combinedPrompt }] }
  ],
  generationConfig: {
    temperature: 0.7,
    responseMimeType: 'application/json'
  }
}
```

#### Mistral AI
**File:** `lib/ai/clients/mistral.ts`  
**API:** `https://api.mistral.ai/v1/chat/completions`  
**Default Model:** `mistral-small-latest`  
**Authentication:** Bearer token (API key)

```typescript
{
  model: config.model || 'mistral-small-latest',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  response_format: { type: 'json_object' },
  temperature: 0.7
}
```

#### Ollama (Local)
**File:** `lib/ai/clients/ollama.ts`  
**API:** `http://localhost:11434/api/generate` (configurable)  
**Default Model:** `llama3.2`  
**Authentication:** None (local)

```typescript
{
  model: config.model || 'llama3.2',
  prompt: combinedPrompt,
  stream: false,
  format: 'json',
  options: {
    temperature: 0.7
  }
}
```

### Common Interface

```typescript
interface AIClient {
  generateRecommendations(params: AIRecommendationParams): Promise<AIRecommendation[]>;
}

interface AIRecommendationParams {
  query: string;
  tasteProfile: TasteProfile;
  contentPreferences: ContentPreferences;
  favourites: Array<{ Title: string; Year: string; Genre?: string }>;
  watchlist: Array<{ Title: string; Year: string }>;
  watched: Array<{ Title: string; Year: string }>;
}

interface AIRecommendation {
  title: string;
  year: string;
  reason: string;
}
```

### Prompt Engineering

**System Prompt:**
```
You are a movie recommendation expert. Based on the user's taste profile and preferences, 
recommend movies that match their query. Return ONLY a JSON array of recommendations.

Each recommendation must have:
- title: The ENGLISH or ORIGINAL movie title (not translated)
- year: Release year (string)
- reason: Brief explanation (1-2 sentences) in {language}

IMPORTANT:
- Use ENGLISH or ORIGINAL titles in JSON (e.g., "Star Trek: Picard" not "Стартрек: Піккард")
- Avoid movies from: {disliked_countries}
- Avoid movies in: {disliked_languages}
- Exclude these watched movies: {watched_titles}
- Exclude these watchlist movies: {watchlist_titles}
- Prefer genres: {top_genres}
- Prefer languages: {top_languages}
- Prefer countries: {top_countries}
```

**User Prompt:**
```
{query}. Respond in {language}. Give exactly {count} unique high-quality diverse recommendations.
```

### Response Parsing

```typescript
// Extract JSON from response (handles markdown code blocks)
const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                  text.match(/\[[\s\S]*\]/);
const recommendations = JSON.parse(jsonMatch[1] || jsonMatch[0]);

// Validate structure
if (!Array.isArray(recommendations)) throw new Error('Invalid format');
recommendations.forEach(rec => {
  if (!rec.title || !rec.year || !rec.reason) throw new Error('Missing fields');
});
```

### Error Handling
- Network errors caught and logged
- Invalid JSON responses handled gracefully
- User-friendly error messages via toast
- Fallback to regular search if AI fails

---

## 3. Country Detection

### Overview
- **Purpose:** Auto-detect user country for streaming providers
- **Location:** `lib/tmdb.ts::detectCountry()`
- **API:** `https://api.country.is/`
- **Caching:** sessionStorage

### Usage
```typescript
export async function detectCountry(): Promise<string> {
  const cached = sessionStorage.getItem('detectedCountry');
  if (cached) return cached;
  
  try {
    const res = await fetch('https://api.country.is/');
    const data = await res.json() as { country?: string };
    const code = data.country ?? 'US';
    sessionStorage.setItem('detectedCountry', code);
    return code;
  } catch {
    return 'US';
  }
}
```

### Response Format
```json
{
  "country": "US",
  "ip": "1.2.3.4"
}
```

---

## 4. Service Worker / PWA

### Overview
- **Purpose:** Offline support, update management
- **Location:** `vite-plugin-pwa` config in `vite.config.ts`
- **Strategy:** Workbox with custom configuration

### Configuration

```typescript
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "My Kino",
    short_name: "My Kino",
    description: "Discover, track, and organize your favourite movies",
    theme_color: "#111111",
    background_color: "#111111",
    display: "standalone",
    scope: "/",
    start_url: "/",
    orientation: "any",
    icons: [/* ... */]
  },
  workbox: {
    navigateFallback: "/index.html",
    navigateFallbackAllowlist: [/^\/.*/],
    clientsClaim: true,
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
    runtimeCaching: [/* ... */]
  }
})
```

### Update Management

**Manual Update Check:**
```typescript
// lib/sw-update.ts
export async function checkAndApplyUpdate() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }
}
```

**Version Checking:**
```typescript
// Check for new version
const res = await fetch(`/version.json?t=${Date.now()}`);
const data = await res.json();
if (data.version !== __APP_VERSION__) {
  // Show update button
}
```

---

## API Usage Patterns

### Parallel Fetching
```typescript
// Fetch multiple sources simultaneously
const [movieData, tvData] = await Promise.all([
  tmdbFetch('/trending/movie/week'),
  tmdbFetch('/trending/tv/week')
]);
```

### Error Tolerance
```typescript
// Use Promise.allSettled for optional data
const results = await Promise.allSettled([
  getRecommendations(id),
  getSimilar(id),
  getTrending()
]);

const successful = results
  .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
  .map(r => r.value);
```

### Pagination
```typescript
// Fetch multiple pages in parallel
const pages = Array.from({ length: 5 }, (_, i) => i + 1);
const results = await Promise.allSettled(
  pages.map(p => getTrending(lang, p))
);
```

### Fallback Strategies
```typescript
// Try movie endpoint, fallback to TV
try {
  return await tmdbFetch(`/movie/${id}`);
} catch {
  return await tmdbFetch(`/tv/${id}`);
}
```

---

## Rate Limiting & Best Practices

### Current Implementation
- No explicit rate limiting
- Relies on browser connection limits (6 per domain)
- Service worker caching reduces API calls

### Recommendations
1. Implement request queuing
2. Add exponential backoff on errors
3. Monitor API usage
4. Implement request deduplication
5. Add request cancellation for stale requests

---

## Security Considerations

### API Keys
- TMDB key in environment variable (public in client)
- AI keys stored in IndexedDB (user-provided)
- No server-side key storage

### CORS
- All APIs support CORS
- No proxy needed

### Data Privacy
- No user data sent to external APIs (except AI prompts)
- AI prompts include only titles, not personal info
- Country detection uses IP (no storage)

---

## Future API Integrations

### Potential Additions
1. **OMDb API** - Alternative movie data source
2. **JustWatch API** - Enhanced streaming availability
3. **Trakt.tv** - Social features, sync
4. **Open Library** - Book data for expansion
5. **Spotify/Last.fm** - Music data for expansion
6. **IGDB** - Game data for expansion
