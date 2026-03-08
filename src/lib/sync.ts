/**
 * Sync layer — bidirectional IDB ↔ Supabase.
 *
 * Strategy (local-first):
 * - All reads always come from IDB (fast, offline-capable).
 * - On login: push local → pull remote → additive merge into IDB.
 * - On each mutation: immediately push that item to Supabase (fire & forget).
 * - Deletions: immediately deleted from Supabase when online.
 *
 * No tombstones in v1. Deletions only sync if the user is online at the time.
 */

import { getSupabase } from './supabase';
import { getDB, type MovieData } from './db';
import type { TVSeriesTracking } from './tvTracking';

const LAST_SYNC_KEY = 'sync_last_at';

export function getLastSyncTime(): number | null {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  return raw ? Number(raw) : null;
}

function setLastSyncTime() {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

// ─── Event-based mutation sync ────────────────────────────────────────────────

export interface SyncEventDetail {
  store: 'watchlist' | 'watched' | 'favourites' | 'tv_tracking';
  action: 'upsert' | 'delete';
  id: string;       // imdbID or tvId
  data?: MovieData | TVSeriesTracking;
}

/** Called by db.ts / tvTracking.ts after every mutation. */
export function dispatchSyncEvent(detail: SyncEventDetail) {
  window.dispatchEvent(new CustomEvent('db:sync', { detail }));
}

/** Set up the global listener. Call once from AuthProvider. */
export function setupSyncListener() {
  window.addEventListener('db:sync', async (e: Event) => {
    const { store, action, id, data } = (e as CustomEvent<SyncEventDetail>).detail;
    const sb = getSupabase();
    if (!sb) return;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    try {
      if (action === 'upsert' && data) {
        const row = buildRow(store, user.id, id, data);
        await sb.from(store).upsert(row, { onConflict: 'user_id,' + primaryKey(store) });
      } else if (action === 'delete') {
        await sb.from(store).delete().eq('user_id', user.id).eq(primaryKey(store), id);
      }
    } catch (e) {
      // Sync failures are silent — data is safe in IDB
      console.warn('[sync] mutation push failed', e);
    }
  });
}

// ─── Full sync (on login) ────────────────────────────────────────────────────

export async function fullSync(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  await Promise.all([
    syncStore('watchlist', user.id),
    syncStore('watched', user.id),
    syncStore('favourites', user.id),
    syncStore('tv_tracking', user.id),
  ]);

  setLastSyncTime();
}

async function syncStore(store: 'watchlist' | 'watched' | 'favourites' | 'tv_tracking', userId: string) {
  const sb = getSupabase()!;
  const db = await getDB();
  const pk = primaryKey(store);

  // 1. Get local items
  const localItems: any[] = await db.getAll(store);

  // 2. Push local items not yet in remote (upsert — safe to call for all)
  if (localItems.length > 0) {
    const rows = localItems.map(item => buildRow(store, userId, item[pk === 'imdb_id' ? 'imdbID' : 'tvId'], item));
    await sb.from(store).upsert(rows, { onConflict: `user_id,${pk}` });
  }

  // 3. Pull all remote items
  const { data: remoteItems, error } = await sb
    .from(store)
    .select('data')
    .eq('user_id', userId);

  if (error) throw error;
  if (!remoteItems?.length) return;

  // 4. Additive merge: add remote items that don't exist locally yet
  const localIds = new Set(localItems.map(item => item[pk === 'imdb_id' ? 'imdbID' : 'tvId']));
  const tx = db.transaction(store, 'readwrite');
  for (const { data } of remoteItems) {
    const remoteId = data?.[pk === 'imdb_id' ? 'imdbID' : 'tvId'];
    if (remoteId && !localIds.has(remoteId)) {
      tx.objectStore(store).put(data);
    }
  }
  await tx.done;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function primaryKey(store: string): string {
  return store === 'tv_tracking' ? 'tv_id' : 'imdb_id';
}

function buildRow(store: string, userId: string, id: string, data: any) {
  const pk = primaryKey(store);
  return {
    user_id: userId,
    [pk]: id,
    data,
    updated_at: Date.now(),
  };
}
