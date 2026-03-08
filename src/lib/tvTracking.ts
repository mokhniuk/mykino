import { getDB } from './db';
import { dispatchSyncEvent } from './sync';

export interface TVSeriesTracking {
  tvId: string; // "tv-{tmdb_id}"
  status: 'watching' | 'completed' | 'planned';
  seasons: Record<number, { watchedEpisodes: number[] }>;
  totalEpisodesWatched: number;
  numberOfEpisodes?: number; // cached from TMDB so list cards can show progress without a fetch
  lastWatchedAt: number;
}

export interface TVSeasonMeta {
  season_number: number;
  name: string;
  episode_count: number;
}

export interface TVEpisode {
  episode_number: number;
  name: string;
  air_date: string;
  overview?: string;
  runtime?: number;
  still_path?: string | null;
}

export async function getTVTracking(tvId: string): Promise<TVSeriesTracking | undefined> {
  const db = await getDB();
  return db.get('tv_tracking', tvId);
}

export async function getAllTVTracking(): Promise<TVSeriesTracking[]> {
  const db = await getDB();
  return db.getAll('tv_tracking');
}

export async function saveTVTracking(tracking: TVSeriesTracking): Promise<void> {
  const db = await getDB();
  await db.put('tv_tracking', tracking);
  dispatchSyncEvent({ store: 'tv_tracking', action: 'upsert', id: tracking.tvId, data: tracking });
}

export async function deleteTVTracking(tvId: string): Promise<void> {
  const db = await getDB();
  await db.delete('tv_tracking', tvId);
  dispatchSyncEvent({ store: 'tv_tracking', action: 'delete', id: tvId });
}

export function computeProgress(
  tracking: TVSeriesTracking,
  seasons: TVSeasonMeta[],
): {
  total: number;
  watched: number;
  nextEpisode: { season: number; episode: number } | null;
} {
  const regularSeasons = seasons.filter(s => s.season_number > 0);
  const total = regularSeasons.reduce((sum, s) => sum + s.episode_count, 0);

  let watched = 0;
  let nextEpisode: { season: number; episode: number } | null = null;

  for (const season of regularSeasons) {
    const seasonData = tracking.seasons[season.season_number];
    const watchedInSeason = seasonData?.watchedEpisodes.length ?? 0;
    watched += watchedInSeason;

    if (nextEpisode === null && watchedInSeason < season.episode_count) {
      const watchedSet = new Set(seasonData?.watchedEpisodes ?? []);
      for (let ep = 1; ep <= season.episode_count; ep++) {
        if (!watchedSet.has(ep)) {
          nextEpisode = { season: season.season_number, episode: ep };
          break;
        }
      }
    }
  }

  return { total, watched, nextEpisode };
}
