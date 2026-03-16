import { readFileSync, writeFileSync, existsSync } from 'fs';

type Period = 'daily' | 'monthly';

interface UsageEntry {
  count: number;
  period: string; // YYYY-MM-DD for daily, YYYY-MM for monthly
}

const PERSIST_PATH = process.env.RATE_LIMIT_FILE || '/tmp/mykino-ratelimit.json';

function periodKey(period: Period): string {
  const now = new Date();
  if (period === 'monthly') return now.toISOString().slice(0, 7); // YYYY-MM
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function storeKey(ip: string, period: Period): string {
  return `${ip}:${period}`;
}

function loadStore(): Map<string, UsageEntry> {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, 'utf-8');
      const obj = JSON.parse(raw) as Record<string, UsageEntry>;
      const today = periodKey('daily');
      const month = periodKey('monthly');
      // Restore entries that are still current for their period
      const entries = Object.entries(obj).filter(([k, v]) => {
        if (k.endsWith(':monthly')) return v.period === month;
        return v.period === today;
      });
      return new Map(entries);
    }
  } catch { /* start fresh on any error */ }
  return new Map();
}

function saveStore() {
  try {
    const obj = Object.fromEntries(store);
    writeFileSync(PERSIST_PATH, JSON.stringify(obj));
  } catch { /* non-fatal — in-memory counts still work */ }
}

const store: Map<string, UsageEntry> = loadStore();

/**
 * Checks and increments usage for a given key (typically an IP address).
 * Returns { allowed, remaining, limit }.
 *
 * Pass limit = Infinity to skip rate limiting (community users).
 */
export function checkRateLimit(
  ip: string,
  limit: number,
  period: Period = 'daily',
): { allowed: boolean; remaining: number; limit: number } {
  if (!isFinite(limit)) return { allowed: true, remaining: Infinity, limit };

  const key = storeKey(ip, period);
  const current = periodKey(period);
  const entry = store.get(key);

  if (!entry || entry.period !== current) {
    store.set(key, { count: 1, period: current });
    saveStore();
    return { allowed: true, remaining: limit - 1, limit };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  entry.count++;
  saveStore();
  return { allowed: true, remaining: limit - entry.count, limit };
}

/** Returns current usage without incrementing (for status checks). */
export function getUsage(
  ip: string,
  limit: number,
  period: Period = 'daily',
): { used: number; remaining: number; limit: number } {
  const key = storeKey(ip, period);
  const current = periodKey(period);
  const entry = store.get(key);
  const used = entry?.period === current ? entry.count : 0;
  return { used, remaining: Math.max(0, limit - used), limit };
}

// Prune stale entries once per hour to avoid unbounded memory growth
setInterval(() => {
  const today = periodKey('daily');
  const month = periodKey('monthly');
  for (const [key, entry] of store) {
    const isMonthly = key.endsWith(':monthly');
    if (isMonthly && entry.period !== month) store.delete(key);
    else if (!isMonthly && entry.period !== today) store.delete(key);
  }
  saveStore();
}, 60 * 60 * 1000);
