import { readFileSync, writeFileSync, existsSync } from 'fs';

interface UsageEntry {
  count: number;
  date: string; // YYYY-MM-DD UTC
}

const PERSIST_PATH = process.env.RATE_LIMIT_FILE || '/tmp/mykino-ratelimit.json';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStore(): Map<string, UsageEntry> {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, 'utf-8');
      const obj = JSON.parse(raw) as Record<string, UsageEntry>;
      const date = today();
      // Only restore entries from today — discard stale ones
      const entries = Object.entries(obj).filter(([, v]) => v.date === date);
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
 * Pass limit = Infinity to skip rate limiting (community / pro users).
 */
export function checkRateLimit(key: string, limit: number): { allowed: boolean; remaining: number; limit: number } {
  if (!isFinite(limit)) return { allowed: true, remaining: Infinity, limit };

  const date = today();
  const entry = store.get(key);

  if (!entry || entry.date !== date) {
    store.set(key, { count: 1, date });
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
export function getUsage(key: string, limit: number): { used: number; remaining: number; limit: number } {
  const date = today();
  const entry = store.get(key);
  const used = entry?.date === date ? entry.count : 0;
  return { used, remaining: Math.max(0, limit - used), limit };
}

// Prune stale entries once per hour to avoid unbounded memory growth
setInterval(() => {
  const date = today();
  for (const [key, entry] of store) {
    if (entry.date !== date) store.delete(key);
  }
  saveStore();
}, 60 * 60 * 1000);
