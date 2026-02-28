import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getHomeSections, clearRecommendationsCache, type RecoSection } from '@/lib/recommendations';
import { getWatched, getFavourites } from '@/lib/db';
import { useI18n } from '@/lib/i18n';

export function useRecommendations() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const prevCountsRef = useRef<{ watched: number; favourites: number } | null>(null);

  const { data: sections = [], isLoading, isFetching } = useQuery<RecoSection[]>({
    queryKey: ['recommendations', lang],
    queryFn: () => getHomeSections(lang),
    staleTime: Infinity,
  });

  const { data: watched } = useQuery({
    queryKey: ['watched'],
    queryFn: getWatched,
    staleTime: 60 * 60 * 1000,
  });

  const { data: favourites } = useQuery({
    queryKey: ['favourites'],
    queryFn: getFavourites,
    staleTime: 60 * 60 * 1000,
  });

  // Auto-invalidate when watched or favourites count changes after initial load
  useEffect(() => {
    const watchedCount = watched?.length ?? 0;
    const favouritesCount = favourites?.length ?? 0;

    if (prevCountsRef.current === null) {
      prevCountsRef.current = { watched: watchedCount, favourites: favouritesCount };
      return;
    }

    if (
      watchedCount !== prevCountsRef.current.watched ||
      favouritesCount !== prevCountsRef.current.favourites
    ) {
      prevCountsRef.current = { watched: watchedCount, favourites: favouritesCount };
      clearRecommendationsCache(lang).then(() => {
        queryClient.invalidateQueries({ queryKey: ['recommendations', lang] });
      });
    }
  }, [watched, favourites, lang, queryClient]);

  const refresh = async () => {
    await clearRecommendationsCache(lang);
    queryClient.invalidateQueries({ queryKey: ['recommendations', lang] });
  };

  return { sections, isLoading, isFetching, refresh };
}
