import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getFavourites, removeFromFavourites,
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  type MovieData,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';

export default function FavouritesPage() {
  const { t } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFavourites().then(async (list) => {
      setMovies(list);
      const wSet = new Set<string>();
      for (const m of list) {
        if (await isInWatchlist(m.imdbID)) wSet.add(m.imdbID);
      }
      setWatchlistIds(wSet);
    });
  }, []);

  const handleRemove = async (id: string) => {
    await removeFromFavourites(id);
    setMovies((m) => m.filter((x) => x.imdbID !== id));
  };

  const toggleWatchlist = async (movie: MovieData) => {
    if (watchlistIds.has(movie.imdbID)) {
      await removeFromWatchlist(movie.imdbID);
      setWatchlistIds((s) => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToWatchlist(movie);
      setWatchlistIds((s) => new Set(s).add(movie.imdbID));
    }
  };

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl md:text-3xl text-foreground pt-6 md:pt-10 mb-6">{t('favourites')}</h1>

      {movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              inWatchlist={watchlistIds.has(movie.imdbID)}
              inFavourites={true}
              onToggleWatchlist={() => toggleWatchlist(movie)}
              onToggleFavourite={() => handleRemove(movie.imdbID)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Heart size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('emptyFavourites')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('startSearching')}</p>
        </div>
      )}
    </div>
  );
}
