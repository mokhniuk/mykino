import { getDB } from './db';
import { getSetting, setSetting } from './db';

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

interface CacheEntry {
    queryHash: string;
    response: string; // stringified AdvisorResponse
    cachedAt: number;
}

function hashQuery(query: string): string {
    // Simple djb2 hash – sufficient for cache keying
    let h = 5381;
    for (let i = 0; i < query.length; i++) {
        h = (((h << 5) + h) + query.charCodeAt(i)) >>> 0;
    }
    return String(h);
}

export async function getCachedAdvisorResponse(query: string): Promise<string | null> {
    try {
        const db = await getDB();
        const key = hashQuery(query.trim().toLowerCase());
        const entry = await db.get('advisor_cache', key) as CacheEntry | undefined;
        if (!entry) return null;
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
            await db.delete('advisor_cache', key);
            return null;
        }
        return entry.response;
    } catch {
        return null;
    }
}

export async function setCachedAdvisorResponse(query: string, response: string): Promise<void> {
    try {
        const db = await getDB();
        const key = hashQuery(query.trim().toLowerCase());
        const entry: CacheEntry = { queryHash: key, response, cachedAt: Date.now() };
        await db.put('advisor_cache', entry);
    } catch {
        // ignore cache write errors
    }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const DAILY_LIMIT = 50;

function todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function getDailyUsage(): Promise<{ count: number; today: string }> {
    const today = todayKey();
    const raw = await getSetting('advisor_daily_count');
    const dateRaw = await getSetting('advisor_daily_date');
    if (dateRaw !== today) {
        return { count: 0, today };
    }
    return { count: parseInt(raw ?? '0', 10), today };
}

export async function checkDailyLimit(): Promise<boolean> {
    const { count } = await getDailyUsage();
    return count < DAILY_LIMIT;
}

export async function incrementDailyLimit(): Promise<void> {
    const { count, today } = await getDailyUsage();
    await setSetting('advisor_daily_date', today);
    await setSetting('advisor_daily_count', String(count + 1));
}

export async function getRemainingCalls(): Promise<number> {
    const { count } = await getDailyUsage();
    return Math.max(0, DAILY_LIMIT - count);
}
