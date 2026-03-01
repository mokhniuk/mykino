import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllTVTracking,
  saveTVTracking,
  deleteTVTracking,
  type TVSeriesTracking,
} from '@/lib/tvTracking';

export function useTVTracking() {
  const queryClient = useQueryClient();

  const { data: trackingList = [], isLoading } = useQuery<TVSeriesTracking[]>({
    queryKey: ['tv_tracking'],
    queryFn: getAllTVTracking,
    staleTime: 5 * 60 * 1000,
  });

  const updateTracking = async (tracking: TVSeriesTracking) => {
    await saveTVTracking(tracking);
    queryClient.setQueryData<TVSeriesTracking[]>(['tv_tracking'], prev => {
      const list = prev ?? [];
      const idx = list.findIndex(t => t.tvId === tracking.tvId);
      if (idx >= 0) return list.map((t, i) => (i === idx ? tracking : t));
      return [...list, tracking];
    });
  };

  const removeTracking = async (tvId: string) => {
    await deleteTVTracking(tvId);
    queryClient.setQueryData<TVSeriesTracking[]>(['tv_tracking'], prev =>
      (prev ?? []).filter(t => t.tvId !== tvId),
    );
  };

  return { trackingList, isLoading, updateTracking, removeTracking };
}
