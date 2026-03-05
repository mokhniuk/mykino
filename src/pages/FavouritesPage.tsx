import { Link } from 'react-router-dom';
import { Heart, Tv } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import {
  getFavourites, removeFromFavourites,
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  type MovieData,
} from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { useState } from 'react';

type Tab = 'movie' | 'series';

type FavouritesData = { movies: MovieData[]; watchlistIds: string[] };

export default function FavouritesPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('movie');

  const { data, isLoading } = useQuery<FavouritesData>({
    queryKey: ['movies', 'favourites', 'page', lang],
    queryFn: async () => {
      const list = await getFavourites();
      const [movies, watchlistChecks] = await Promise.all([
        Promise.all(list.map(m => getMovieDetails(m.imdbID, lang).then(d => d ?? m))),
        Promise.all(list.map(m => isInWatchlist(m.imdbID))),
      ]);
      return {
        movies,
        watchlistIds: list.filter((_, i) => watchlistChecks[i]).map(m => m.imdbID),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const movies = data?.movies ?? [];
  const watchlistIdSet = new Set(data?.watchlistIds ?? []);

  const handleRemove = async (id: string) => {
    await removeFromFavourites(id);
    queryClient.setQueryData<FavouritesData>(['movies', 'favourites', 'page', lang], prev =>
      prev ? { ...prev, movies: prev.movies.filter(m => m.imdbID !== id) } : prev
    );
    queryClient.invalidateQueries({ queryKey: ['movies', 'favourites'] });
  };

  const toggleWatchlist = async (movie: MovieData) => {
    if (watchlistIdSet.has(movie.imdbID)) {
      await removeFromWatchlist(movie.imdbID);
      queryClient.setQueryData<FavouritesData>(['movies', 'favourites', 'page', lang], prev =>
        prev ? { ...prev, watchlistIds: prev.watchlistIds.filter(id => id !== movie.imdbID) } : prev
      );
    } else {
      await addToWatchlist(movie);
      queryClient.setQueryData<FavouritesData>(['movies', 'favourites', 'page', lang], prev =>
        prev ? { ...prev, watchlistIds: [...prev.watchlistIds, movie.imdbID] } : prev
      );
    }
    queryClient.invalidateQueries({ queryKey: ['movies', 'watchlist'] });
  };

  const filtered = movies.filter((m) => (m.Type || 'movie') === tab);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'movie', label: t('tabMovies') },
    { value: 'series', label: t('tabSeries') },
  ];

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl md:text-3xl text-foreground">{t('favourites')}</h1>
          {!isLoading && <span className="text-lg font-medium text-muted-foreground">{filtered.length}</span>}
        </div>
        <div className="flex gap-0.5 p-1 bg-secondary rounded-xl">
          {tabs.map((tb) => (
            <button
              key={tb.value}
              onClick={() => setTab(tb.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === tb.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
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
              inWatchlist={watchlistIdSet.has(movie.imdbID)}
              inFavourites={true}
              onToggleWatchlist={() => toggleWatchlist(movie)}
              onToggleFavourite={() => handleRemove(movie.imdbID)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            {tab === 'series'
              ? <Tv size={28} className="text-muted-foreground/40" />
              : <Heart size={28} className="text-muted-foreground/40" />}
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {tab === 'series' ? t('emptyFavSeriesHere') : t('emptyFavMoviesHere')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('emptyHintFavourites')}</p>
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
