import { getWatched, getFavourites, getSetting, setSetting, getWatchlist, getContentPreferences, type ContentPreferences } from './db';
import { getCountries, getLanguages } from './api';
import { computeMilestones, computeDirectorCompletions } from './achievements';
import type { AdvisorRecommendation, AdvisorResponse } from './advisorTmdb';
import { validateWithTmdb } from './advisorTmdb';
import {
    getCachedAdvisorResponse,
    setCachedAdvisorResponse,
    checkDailyLimit,
    incrementDailyLimit,
} from './advisorCache';

export type { AdvisorRecommendation, AdvisorResponse };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function formatPreferences(prefs: ContentPreferences): Promise<{
    likedGenres: string;
    dislikedGenres: string;
    likedCountries: string;
    dislikedCountries: string;
    likedLangs: string;
    dislikedLangs: string;
}> {
    const [countries, languages] = await Promise.all([getCountries(), getLanguages()]);

    const countryMap = new Map(countries.map(c => [c.iso_3166_1, c.english_name]));
    const langMap = new Map(languages.map(l => [l.iso_639_1, l.english_name]));

    const genresToNames = (ids: number[]) => ids.map(id => GENRE_MAP[id] ?? id).join(', ');
    const countriesToNames = (ids: string[]) => ids.map(id => countryMap.get(id) ?? id).join(', ');
    const langsToNames = (ids: string[]) => ids.map(id => langMap.get(id) ?? id).join(', ');

    return {
        likedGenres: genresToNames(prefs.liked_genres),
        dislikedGenres: genresToNames(prefs.disliked_genres),
        likedCountries: countriesToNames(prefs.liked_countries),
        dislikedCountries: countriesToNames(prefs.disliked_countries),
        likedLangs: langsToNames(prefs.liked_languages),
        dislikedLangs: langsToNames(prefs.disliked_languages),
    };
}

// ─── Taste Summary ────────────────────────────────────────────────────────────

const TASTE_SUMMARY_KEY = 'advisor_taste_summary';
const TASTE_SUMMARY_TTL = 24 * 60 * 60 * 1000; // 24 hours

const GENRE_MAP: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
    878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

export async function generateTasteSummary(): Promise<string> {
    // Check cached summary
    const cached = await getSetting(TASTE_SUMMARY_KEY);
    if (cached) {
        try {
            const { summary, builtAt } = JSON.parse(cached) as { summary: string; builtAt: number };
            if (Date.now() - builtAt < TASTE_SUMMARY_TTL) return summary;
        } catch { /* ignore */ }
    }

    const [watched, favourites] = await Promise.all([getWatched(), getFavourites()]);

    // Genre frequency (favourites weight ×3, watched ×1)
    const genreFreq = new Map<number, number>();
    for (const m of favourites) {
        for (const id of m.genre_ids ?? []) genreFreq.set(id, (genreFreq.get(id) ?? 0) + 3);
    }
    for (const m of watched) {
        for (const id of m.genre_ids ?? []) genreFreq.set(id, (genreFreq.get(id) ?? 0) + 1);
    }

    const topGenres = [...genreFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => GENRE_MAP[id] ?? String(id))
        .filter(Boolean);

    // Director frequency
    const dirFreq = new Map<string, number>();
    for (const m of [...favourites, ...watched]) {
        if (!m.Director || m.Director === 'N/A') continue;
        const dir = m.Director.split(',')[0].trim();
        if (dir) dirFreq.set(dir, (dirFreq.get(dir) ?? 0) + 1);
    }
    const topDirectors = [...dirFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([, count]) => count >= 2)
        .map(([name]) => name);

    // Language frequency
    const langFreq = new Map<string, number>();
    for (const m of watched) {
        if (m.original_language && m.original_language !== 'en') {
            langFreq.set(m.original_language, (langFreq.get(m.original_language) ?? 0) + 1);
        }
    }
    const topLangs = [...langFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .filter(([, count]) => count >= 2)
        .map(([lang]) => lang);

    // Decade preference
    const decadeFreq = new Map<string, number>();
    for (const m of watched) {
        const y = parseInt(m.Year, 10);
        if (!isNaN(y)) {
            const decade = `${Math.floor(y / 10) * 10}s`;
            decadeFreq.set(decade, (decadeFreq.get(decade) ?? 0) + 1);
        }
    }
    const topDecades = [...decadeFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([d]) => d);

    // Build summary string
    const parts: string[] = [];
    if (topGenres.length > 0) {
        parts.push(`User enjoys ${topGenres.join(', ')} films`);
    }
    if (topDirectors.length > 0) {
        parts.push(`frequently watches films by ${topDirectors.join(', ')}`);
    }
    if (topLangs.length > 0) {
        const langNames: Record<string, string> = {
            fr: 'French', de: 'German', it: 'Italian', ja: 'Japanese', ko: 'Korean',
            zh: 'Chinese', es: 'Spanish', ru: 'Russian', pl: 'Polish', uk: 'Ukrainian',
        };
        const langStr = topLangs.map(l => langNames[l] ?? l).join(' and ');
        parts.push(`has a taste for ${langStr} cinema`);
    }
    if (topDecades.length > 0) {
        parts.push(`tends toward films from the ${topDecades.join(' and ')}`);
    }

    const summary = parts.length > 0
        ? parts.join(', ') + '.'
        : 'User has a diverse film taste with no strong patterns yet.';

    await setSetting(TASTE_SUMMARY_KEY, JSON.stringify({ summary, builtAt: Date.now() }));
    return summary;
}

// ─── User Context Aggregation ─────────────────────────────────────────────────

interface UserContext {
    recentlyWatched: { title: string; year: string }[];
    topRated: { title: string; year: string }[];
    watchlist: { title: string; year: string }[];
    preferences: ContentPreferences;
    formattedPrefs: {
        likedGenres: string;
        dislikedGenres: string;
        likedCountries: string;
        dislikedCountries: string;
        likedLangs: string;
        dislikedLangs: string;
    };
    directors: string[];
    milestones: { id: string; unlocked: boolean }[];
    directorCollections: { name: string; count: number }[];
}

// ... aggregateUserContext would need to call formatPreferences ...

export async function aggregateUserContext(): Promise<UserContext> {
    const [watched, favourites, watchlist, preferences] = await Promise.all([
        getWatched(),
        getFavourites(),
        getWatchlist(),
        getContentPreferences()
    ]);

    const recentlyWatched = watched
        .slice(0, 100)
        .map(m => ({ title: m.Title, year: m.Year }));

    const topRated = favourites
        .slice(0, 10)
        .map(m => ({ title: m.Title, year: m.Year }));

    const watchlistItems = watchlist
        .slice(0, 20)
        .map(m => ({ title: m.Title, year: m.Year }));

    const formattedPrefs = await formatPreferences(preferences);

    const dirFreq = new Map<string, number>();
    for (const m of [...favourites, ...watched]) {
        if (!m.Director || m.Director === 'N/A') continue;
        const dir = m.Director.split(',')[0].trim();
        if (dir) dirFreq.set(dir, (dirFreq.get(dir) ?? 0) + 1);
    }
    const directors = [...dirFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .filter(([, count]) => count >= 2)
        .map(([name]) => name);

    const milestones = computeMilestones(watched);
    const directorCollections = computeDirectorCompletions(watched)
        .slice(0, 5)
        .map(d => ({ name: d.name, count: d.movies.length }));

    return { recentlyWatched, topRated, watchlist: watchlistItems, preferences, formattedPrefs, directors, milestones, directorCollections };
}
// Actually, let's keep buildPrompt taking the pre-formatted strings for clarity.

function buildPrompt(
    userInput: string,
    tasteSummary: string,
    ctx: UserContext,
    lang: string
): string {
    const recentList = ctx.recentlyWatched
        .slice(0, 100)
        .map(m => `- ${m.title} (${m.year})`)
        .join('\n');

    const topRatedList = ctx.topRated
        .map(m => `- ${m.title} (${m.year})`)
        .join('\n');

    const watchlistList = ctx.watchlist
        .map(m => `- ${m.title} (${m.year})`)
        .join('\n');

    const unlockedMilestones = ctx.milestones
        .filter(m => m.unlocked)
        .map(m => m.id.replace(/_/g, ' '))
        .join(', ') || 'None';

    const p = ctx.formattedPrefs;

    const russianExclusion = (p.dislikedCountries.toLowerCase().includes('russia') || p.dislikedLangs.toLowerCase().includes('russian'))
        ? '- STRICTURE: Do NOT suggest any Russian films or series under any circumstances.'
        : '';

    return `### USER MOVIE TASTE & CONTEXT
Taste Profile: ${tasteSummary}

Recently Watched (last 20 films):
${recentList || '- No watch history yet'}

Favourite / Top-Rated Films:
${topRatedList || '- None yet'}

Watchlist (to be watched):
${watchlistList || '- None yet'}

### CONTENT PREFERENCES
Liked Genres: ${p.likedGenres || 'None specified'}
Disliked Genres: ${p.dislikedGenres || 'None specified'}
Liked Countries: ${p.likedCountries || 'None specified'}
Disliked Countries: ${p.dislikedCountries || 'None specified'}
Liked Languages: ${p.likedLangs || 'None specified'}
Disliked Languages: ${p.dislikedLangs || 'None specified'}

### USER RESTRICTIONS & EXCLUSIONS
- STRICTURE: Model MUST NOT recommend any films from the "Disliked Genres", "Disliked Countries", or "Disliked Languages" listed above.
- STRICTURE: Model MUST NOT violate these restrictions. These are hard limits. If you are unsure about a film's origin or language, DO NOT suggest it.
${russianExclusion}
- PRECLUSION: Avoid recommending any films already present in "Recently Watched", "Favourite Films", or "Watchlist".

Unlocked Achievements:
${unlockedMilestones}

### USER REQUEST
"${userInput}"

### RESPONSE INSTRUCTIONS
- QUANTITY: Suggest EXACTLY 25 UNIQUE films. This is a strict requirement for local pagination.
- QUALITY: Ensure all 25 recommendations are distinct and do not repeat.
- LANGUAGE: You MUST respond in ${lang === 'uk' ? 'Ukrainian' : lang}. All text (summary, reasons) MUST be in this language.
- SELECTION: Prefer well-known, high-quality films that are easily found via movie databases.
- FORMAT: Respond ONLY with a valid JSON object. No markdown blocks, no commentary.

{
  "summary": "Reasoning for these specific choices in ${lang === 'uk' ? 'Ukrainian' : lang}",
  "recommendations": [
    {
      "title": "Exact Movie Title",
      "year": 2022,
      "type": "movie",
      "reason": "Why this specific film fits the user's taste, in ${lang === 'uk' ? 'Ukrainian' : lang}",
      "confidence": 0.9
    }
  ]
}`;
}

// ─── Main Advisor Call ────────────────────────────────────────────────────────

export class AdvisorGateError extends Error {
    constructor(public readonly code: 'not_enough_watched' | 'rate_limit_exceeded') {
        super(code);
        this.name = 'AdvisorGateError';
    }
}

export async function callAdvisor(
    userInput: string,
    lang = 'en',
    retryCount = 0,
    bypassCache = false
): Promise<AdvisorResponse> {
    // Sanitize input
    const sanitized = userInput.trim().slice(0, 500);
    if (!sanitized) throw new Error('Empty query');

    // Gate: must have at least 5 watched films
    const watched = await getWatched();
    if (watched.length < 5) {
        throw new AdvisorGateError('not_enough_watched');
    }

    // Check rate limit
    const canProceed = await checkDailyLimit();
    if (!canProceed) {
        throw new AdvisorGateError('rate_limit_exceeded');
    }

    // Check cache (only first attempt and if not bypassed)
    if (retryCount === 0 && !bypassCache) {
        const cached = await getCachedAdvisorResponse(sanitized);
        if (cached) {
            try {
                return JSON.parse(cached) as AdvisorResponse;
            } catch { /* invalid cache */ }
        }
    }

    // Aggregate context and build prompt
    const [tasteSummary, ctx] = await Promise.all([
        generateTasteSummary(),
        aggregateUserContext(),
    ]);

    const prompt = buildPrompt(sanitized, tasteSummary, ctx, lang);

    // Call backend proxy
    const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
        throw new Error(`Advisor API error: ${res.status}`);
    }

    const text = await res.text();

    function extractJson(s: string): string {
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start === -1 || end === -1) return s;
        return s.substring(start, end + 1);
    }

    // Parse JSON response
    let parsed: AdvisorResponse;
    try {
        parsed = JSON.parse(extractJson(text)) as AdvisorResponse;
    } catch {
        // Retry once on invalid JSON
        if (retryCount < 1) {
            return callAdvisor(userInput, lang, retryCount + 1, bypassCache);
        }
        throw new Error('Invalid JSON from advisor');
    }

    // Validate recommendations against TMDB
    const validated = await validateWithTmdb(parsed.recommendations ?? [], lang);

    // Filter out movies already in any of the user's lists
    const [watchedList, favouritesList, watchlistList, prefs] = await Promise.all([
        getWatched(),
        getFavourites(),
        getWatchlist(),
        getContentPreferences(),
    ]);

    const existingIds = new Set([
        ...watchedList.map((m) => m.imdbID),
        ...favouritesList.map((m) => m.imdbID),
        ...watchlistList.map((m) => m.imdbID),
    ]);

    const dislikedCountries = new Set(prefs.disliked_countries.map(c => c.toUpperCase()));
    const dislikedLangs = new Set(prefs.disliked_languages.map(l => l.toLowerCase()));

    // Deduplicate by tmdbId and apply strict safety-net exclusions
    const uniqueMap = new Map<string, AdvisorRecommendation>();
    for (const rec of validated) {
        if (!rec.tmdbId) continue;
        if (existingIds.has(rec.tmdbId)) {
            console.log(`[Advisor Filter] Skipping already seen/watchlisted: ${rec.title} (${rec.tmdbId})`);
            continue;
        }
        if (uniqueMap.has(rec.tmdbId)) {
            console.log(`[Advisor Filter] Skipping internal duplicate: ${rec.title} (${rec.tmdbId})`);
            continue;
        }

        // Safety Net: Block excluded countries or languages even if AI suggested them
        const isExcludedCountry = rec.origin_country?.some(c => dislikedCountries.has(c.toUpperCase()));
        const isExcludedLang = rec.original_language && dislikedLangs.has(rec.original_language.toLowerCase());

        if (isExcludedCountry || isExcludedLang) {
            console.log(`[Advisor Safety Net] Blocked excluded film: ${rec.title} (${rec.tmdbId}) - Country: ${rec.origin_country?.join(',')}, Lang: ${rec.original_language}`);
            continue;
        }

        uniqueMap.set(rec.tmdbId, rec);
    }

    const filtered = Array.from(uniqueMap.values());

    // If all were removed by filtering or TMDB validation, retry once with a note
    if (filtered.length === 0 && (parsed.recommendations?.length ?? 0) > 0 && retryCount < 1) {
        return callAdvisor(userInput + ' (please suggest strictly new films the user hasn\'t seen and obey all exclusions)', lang, retryCount + 1, bypassCache);
    }

    const finalResponse: AdvisorResponse = {
        summary: parsed.summary ?? '',
        recommendations: filtered,
    };

    // Increment rate limit and cache on success
    await incrementDailyLimit();
    if (validated.length > 0) {
        await setCachedAdvisorResponse(sanitized, JSON.stringify(finalResponse));
    }

    return finalResponse;
}
