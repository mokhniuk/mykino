import { useState, useEffect } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getWatchlist, removeFromWatchlist,
  addToFavourites, removeFromFavourites, isInFavourites,
  type MovieData,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';

export default function WatchlistPage() {
  const { t } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getWatchlist().then(async (list) => {
      setMovies(list);
      const fSet = new Set<string>();
      for (const m of list) {
        if (await isInFavourites(m.imdbID)) fSet.add(m.imdbID);
      }
      setFavIds(fSet);
    });
  }, []);

  const handleRemove = async (id: string) => {
    await removeFromWatchlist(id);
    setMovies((m) => m.filter((x) => x.imdbID !== id));
  };

  const toggleFav = async (movie: MovieData) => {
    if (favIds.has(movie.imdbID)) {
      await removeFromFavourites(movie.imdbID);
      setFavIds((s) => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToFavourites(movie);
      setFavIds((s) => new Set(s).add(movie.imdbID));
    }
  };

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl md:text-3xl text-foreground pt-6 md:pt-10 mb-6">{t('watchlist')}</h1>

      {movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              inWatchlist={true}
              inFavourites={favIds.has(movie.imdbID)}
              onToggleWatchlist={() => handleRemove(movie.imdbID)}
              onToggleFavourite={() => toggleFav(movie)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <BookmarkPlus size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('emptyWatchlist')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('startSearching')}</p>
        </div>
      )}
    </div>
  );
}
