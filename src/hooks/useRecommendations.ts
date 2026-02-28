import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getPersonalizedRecommendations, clearRecommendationsCache } from '@/lib/recommendations';
import { getWatched } from '@/lib/db';
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

  const recommendations = useMemo(() => {
    if (!rawRecommendations) return [];
    if (!watched?.length) return rawRecommendations;
    const watchedIds = new Set(watched.map(m => m.imdbID));
    return rawRecommendations.filter(m => !watchedIds.has(m.imdbID));
  }, [rawRecommendations, watched]);

  const refresh = () => {
    clearRecommendationsCache(lang);
    queryClient.invalidateQueries({ queryKey: ['recommendations', lang] });
  };

  return { recommendations, isLoading, isFetching, refresh };
}
