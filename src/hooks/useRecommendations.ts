import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getPersonalizedRecommendations, clearRecommendationsCache } from '@/lib/recommendations';
import { getWatched, getWatchlist } from '@/lib/db';
import { useI18n } from '@/lib/i18n';

export function useRecommendations() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: rawRecommendations, isLoading: recoLoading, isFetching } = useQuery({
    queryKey: ['recommendations', lang],
    queryFn: () => getPersonalizedRecommendations(lang),
    staleTime: Infinity,
  });

  // staleTime matches session length — data stays fresh until explicitly invalidated
  // (MovieDetailsPage invalidates on watched/watchlist changes)
  const { data: watched, isLoading: watchedLoading } = useQuery({
    queryKey: ['watched'],
    queryFn: getWatched,
    staleTime: 60 * 60 * 1000,
  });

  const { data: watchlist, isLoading: watchlistLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    staleTime: 60 * 60 * 1000,
  });

  // Hold isLoading true until all three queries have data so the UI never
  // shows an unfiltered list that then shrinks when watched/watchlist arrive.
  const isLoading = recoLoading || watchedLoading || watchlistLoading;

  const recommendations = useMemo(() => {
    if (!rawRecommendations) return [];
    const excludedIds = new Set([
      ...(watched ?? []).map(m => m.imdbID),
      ...(watchlist ?? []).map(m => m.imdbID),
    ]);
    if (!excludedIds.size) return rawRecommendations;
    return rawRecommendations.filter(m => !excludedIds.has(m.imdbID));
  }, [rawRecommendations, watched, watchlist]);

  const refresh = () => {
    clearRecommendationsCache(lang);
    queryClient.invalidateQueries({ queryKey: ['recommendations', lang] });
  };

  return { recommendations, isLoading, isFetching, refresh };
}
