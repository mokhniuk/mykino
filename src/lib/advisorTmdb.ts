import { searchMovies } from './tmdb';
import type { MovieData } from './db';

export interface AdvisorRecommendation {
    title: string;
    year: number;
    type: 'movie' | 'tv';
    reason: string;
    confidence: number;
    // Added after TMDB validation:
    tmdbId?: string;
    poster?: string;
    tmdbData?: MovieData;
    origin_country?: string[];
    original_language?: string;
}

export interface AdvisorResponse {
    summary: string;
    recommendations: AdvisorRecommendation[];
}

// ─── TMDB title similarity check ─────────────────────────────────────────────

function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '') // Remove lead articles
        .replace(/[:\-].*$/, '')     // Remove subtitles after colon/dash
        .replace(/\bii\b/g, '2')      // Roman numerals
        .replace(/\biii\b/g, '3')
        .replace(/\biv\b/g, '4')
        .replace(/\bv\b/g, '5')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isTitleMatch(a: string, b: string): boolean {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    // Allow one to be a substring of the other
    if (na.includes(nb) || nb.includes(na)) return true;
    return false;
}

/** Validates recommendations against TMDB. Returns only verified ones with poster + tmdbId attached. */
export async function validateWithTmdb(
    recs: AdvisorRecommendation[],
    lang = 'en'
): Promise<AdvisorRecommendation[]> {
    const validated: AdvisorRecommendation[] = [];

    for (const rec of recs) {
        try {
            // Step 1: Search with Title + Year
            let result = await searchMovies(`${rec.title} ${rec.year}`, 1, lang);

            // Step 2: If no results, retry with just Title (AI might have wrong year)
            if (result.Response !== 'True' || !result.Search?.length) {
                result = await searchMovies(rec.title, 1, lang);
            }

            if (result.Response !== 'True' || !result.Search?.length) continue;

            // Find the best match
            const match = result.Search.find((m) => {
                const yearMatch =
                    !m.Year ||
                    Math.abs(parseInt(m.Year, 10) - rec.year) <= 1;

                const titleMatch = isTitleMatch(m.Title, rec.title) ||
                    (m.OriginalTitle && isTitleMatch(m.OriginalTitle, rec.title));

                return titleMatch && (yearMatch || result.Search!.length === 1);
            }) || result.Search[0]; // Fallback to first result if it's the only one and somewhat close

            if (!match) continue;

            validated.push({
                ...rec,
                title: match.Title, // Overwrite with official TMDB title
                year: parseInt(match.Year, 10) || rec.year, // Overwrite with official year
                tmdbId: match.imdbID,
                poster: match.Poster !== 'N/A' ? match.Poster : undefined,
                tmdbData: match,
                origin_country: match.origin_country,
                original_language: match.original_language,
            });
        } catch {
            // Skip this rec if TMDB lookup fails
        }
    }

    return validated;
}
