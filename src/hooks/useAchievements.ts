import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useRef, useState } from 'react';
import { getWatched, enrichWatchedMovie, setSetting, type MovieData } from '@/lib/db';
import { getMovieDetails } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  getDailyTop100Pick,
  computeDirectorCompletions,
  computeMilestones,
  computeTop100Progress,
  computeUnwatchedTop100,
  type DirectorCompletion,
  type Milestone,
} from '@/lib/achievements';

export function useAchievements() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const enrichedRef = useRef<Set<string>>(new Set());
  const [dailyPickId, setDailyPickId] = useState<string | null>(null);
  const [dailyPickMovie, setDailyPickMovie] = useState<MovieData | null>(null);
  const [dailyPickLoading, setDailyPickLoading] = useState(true);

  // Shares the same query key as useRecommendations so TanStack deduplicates the fetch.
  // No hydration here — watched list loads instantly from IDB.
  const { data: watched = [], isLoading } = useQuery<MovieData[]>({
    queryKey: ['movies', 'watched', 'list'],
    queryFn: getWatched,
    staleTime: 60 * 60 * 1000,
  });

  // Background enrichment: fills Director/Genre/Country for movies added without
  // going through the detail page (e.g. search, landing setup, quick-add).
  // Batched 5 at a time; writes back to the watched store so next load is instant.
  // Tracks enriched imdbIDs so newly-added items are processed on the next render.
  useEffect(() => {
    if (watched.length === 0) return;
    const missing = watched.filter(
      m => (!m.Director || !m.Genre || !m.Country) && !enrichedRef.current.has(m.imdbID)
    );
    if (missing.length === 0) return;

    // Mark all as in-flight immediately to prevent duplicate runs
    missing.forEach(m => enrichedRef.current.add(m.imdbID));

    let cancelled = false;
    (async () => {
      let anyEnriched = false;
      for (let i = 0; i < missing.length; i += 5) {
        if (cancelled) break;
        await Promise.allSettled(
          missing.slice(i, i + 5).map(async m => {
            try {
              const full = await getMovieDetails(m.imdbID, 'en');
              if (full && !cancelled) {
                await enrichWatchedMovie(full);
                anyEnriched = true;
              }
            } catch { /* non-fatal */ }
          })
        );
      }
      if (!cancelled && anyEnriched) {
        queryClient.invalidateQueries({ queryKey: ['movies', 'watched', 'list'] });
      }
    })();

    return () => { cancelled = true; };
  }, [watched, queryClient]);

  const watchedArray = Array.isArray(watched) ? watched : [];
  const unwatchedTop100 = useMemo(() => computeUnwatchedTop100(watchedArray), [watchedArray]);
  const top100Progress = useMemo(() => computeTop100Progress(watchedArray), [watchedArray]);
  const directors = useMemo<DirectorCompletion[]>(() => computeDirectorCompletions(watchedArray), [watchedArray]);
  const milestones = useMemo<Milestone[]>(() => computeMilestones(watchedArray), [watchedArray]);

  // Resolve the daily pick ID once watched list is ready
  useEffect(() => {
    if (isLoading) return;
    getDailyTop100Pick(unwatchedTop100).then(setDailyPickId);
  }, [isLoading, unwatchedTop100]);

  const shuffleDailyPick = async () => {
    if (unwatchedTop100.length === 0) return;
    const pool = unwatchedTop100.filter(m => m.imdbID !== dailyPickId);
    const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : unwatchedTop100[0];
    await setSetting('daily_top100_date', new Date().toISOString().slice(0, 10));
    await setSetting('daily_top100_id', pick.imdbID);
    setDailyPickId(pick.imdbID);
  };

  // Fetch movie details for the daily pick
  useEffect(() => {
    if (!dailyPickId) {
      setDailyPickMovie(null);
      setDailyPickLoading(unwatchedTop100.length > 0);
      return;
    }
    let cancelled = false;
    setDailyPickLoading(true);
    getMovieDetails(dailyPickId, lang).then(data => {
      if (cancelled) return;
      setDailyPickMovie(
        data ?? { imdbID: dailyPickId, Title: dailyPickId, Year: '', Poster: 'N/A', Type: 'movie' }
      );
      setDailyPickLoading(false);
    });
    return () => { cancelled = true; };
  }, [dailyPickId, lang, unwatchedTop100.length]);

  return {
    watched,
    directors,
    milestones,
    dailyPickId,
    dailyPickMovie,
    dailyPickLoading,
    top100Progress,
    isLoading,
    shuffleDailyPick,
  };
}
