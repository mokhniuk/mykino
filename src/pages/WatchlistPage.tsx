import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import {
  getWatchlist, removeFromWatchlist,
  addToWatched,
  type MovieData,
} from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTVTracking } from '@/hooks/useTVTracking';

type Filter = 'all' | 'movie' | 'series';

export default function WatchlistPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const { trackingList } = useTVTracking();
  const trackingMap = Object.fromEntries(trackingList.map(tr => [tr.tvId, tr]));

  const { data: movies = [], isLoading } = useQuery<MovieData[]>({
    queryKey: ['movies', 'watchlist', 'page', lang],
    queryFn: async () => {
      const list = await getWatchlist();
      return Promise.all(list.map(m => getMovieDetails(m.imdbID, lang).then(d => d ?? m)));
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleMarkWatched = async (movie: MovieData) => {
    await addToWatched(movie);
    await removeFromWatchlist(movie.imdbID);
    queryClient.setQueryData<MovieData[]>(['movies', 'watchlist', 'page', lang], prev =>
      (prev ?? []).filter(m => m.imdbID !== movie.imdbID)
    );
    queryClient.invalidateQueries({ queryKey: ['movies', 'watched'] });
    queryClient.invalidateQueries({ queryKey: ['movies', 'watchlist'] });
  };

  const filtered = filter === 'all' ? movies : movies.filter((m) => (m.Type || 'movie') === filter);

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl md:text-3xl text-foreground">{t('watchlist')}</h1>
          {!isLoading && <span className="text-lg font-medium text-muted-foreground">{filtered.length}</span>}
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-auto h-auto px-3.5 py-1.5 text-md gap-2 font-medium bg-secondary border-0 rounded-xl shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tabAll')}</SelectItem>
            <SelectItem value="movie">{t('tabMovies')}</SelectItem>
            <SelectItem value="series">{t('tabSeries')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
              <div className="h-2.5 bg-secondary rounded animate-pulse" />
              <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              fluid
              onToggleWatched={movie.Type !== 'series' ? () => handleMarkWatched(movie) : undefined}
              progress={movie.Type === 'series' ? (() => {
                const tr = trackingMap[movie.imdbID];
                return tr ? { watched: tr.totalEpisodesWatched, total: tr.numberOfEpisodes ?? 0 } : undefined;
              })() : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Film size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {filter === 'series' ? t('emptySeriesHere') : t('emptyMoviesHere')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('emptyHintWatchlist')}</p>
          <Link
            to="/app/search"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('discoverNow')}
          </Link>
        </div>
      )}
    </div>
  );
}
