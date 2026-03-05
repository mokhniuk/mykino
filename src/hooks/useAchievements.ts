import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useState } from 'react';
import { getWatched, type MovieData } from '@/lib/db';
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
  const [dailyPickId, setDailyPickId] = useState<string | null>(null);
  const [dailyPickMovie, setDailyPickMovie] = useState<MovieData | null>(null);
  const [dailyPickLoading, setDailyPickLoading] = useState(true);

  const { data: watched = [], isLoading } = useQuery<MovieData[]>({
    queryKey: ['watched', lang],
    queryFn: async () => {
      const list = await getWatched();
      // Hydrate with full details to ensure Director and other metadata is present
      return Promise.all(list.map(m => getMovieDetails(m.imdbID, lang).then(d => d ?? m)));
    },
    staleTime: 60 * 60 * 1000,
  });

  const unwatchedTop100 = useMemo(() => computeUnwatchedTop100(watched), [watched]);
  const top100Progress = useMemo(() => computeTop100Progress(watched), [watched]);
  const directors = useMemo<DirectorCompletion[]>(() => computeDirectorCompletions(watched), [watched]);
  const milestones = useMemo<Milestone[]>(() => computeMilestones(watched), [watched]);

  // Resolve the daily pick ID once watched list is ready
  useEffect(() => {
    if (isLoading) return;
    getDailyTop100Pick(unwatchedTop100).then(setDailyPickId);
  }, [isLoading, unwatchedTop100]);

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
  };
}
