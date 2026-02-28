import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getPersonalizedRecommendations, clearRecommendationsCache } from '@/lib/recommendations';
import { getWatched, getWatchlist } from '@/lib/db';
import { useI18n } from '@/lib/i18n';

export function useRecommendations() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: rawRecommendations, isLoading, isFetching } = useQuery({
    queryKey: ['recommendations', lang],
    queryFn: () => getPersonalizedRecommendations(lang),
    staleTime: Infinity,
  });

  const { data: watched } = useQuery({
    queryKey: ['watched'],
    queryFn: getWatched,
    staleTime: 0,
  });

  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    staleTime: 0,
  });

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
