import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Tv } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getFavourites, removeFromFavourites,
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  type MovieData,
} from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';

type Tab = 'movie' | 'series';

export default function FavouritesPage() {
  const { t, lang } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('movie');

  useEffect(() => {
    let cancelled = false;
    getFavourites().then(async (list) => {
      const localized = await Promise.all(
        list.map(m => getMovieDetails(m.imdbID, lang).then(data => data ?? m))
      );
      if (cancelled) return;
      setMovies(localized);
      const wSet = new Set<string>();
      for (const m of list) {
        if (await isInWatchlist(m.imdbID)) wSet.add(m.imdbID);
      }
      if (!cancelled) setWatchlistIds(wSet);
    });
    return () => { cancelled = true; };
  }, [lang]);

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

  const filtered = movies.filter((m) => (m.Type || 'movie') === tab);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'movie', label: t('tabMovies') },
    { value: 'series', label: t('tabSeries') },
  ];

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-6">
        <h1 className="text-2xl md:text-3xl text-foreground">{t('favourites')}</h1>
        <div className="flex gap-0.5 p-1 bg-secondary rounded-xl">
          {tabs.map((tb) => (
            <button
              key={tb.value}
              onClick={() => setTab(tb.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === tb.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              fluid
              inWatchlist={watchlistIds.has(movie.imdbID)}
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
            to="/search"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('discoverNow')}
          </Link>
        </div>
      )}
    </div>
  );
}
