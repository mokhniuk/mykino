import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Film, Tv, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getWatchlist, removeFromWatchlist,
  addToFavourites, removeFromFavourites, isInFavourites,
  getWatched, removeFromWatched,
  type MovieData,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';

type Tab = 'movie' | 'series';

export default function WatchlistPage() {
  const { t } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<MovieData[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('movie');

  useEffect(() => {
    getWatchlist().then(async (list) => {
      setMovies(list);
      const fSet = new Set<string>();
      for (const m of list) {
        if (await isInFavourites(m.imdbID)) fSet.add(m.imdbID);
      }
      setFavIds(fSet);
    });
    getWatched().then(setWatchedMovies);
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

  const handleUnwatch = async (id: string) => {
    await removeFromWatched(id);
    setWatchedMovies((m) => m.filter((x) => x.imdbID !== id));
  };

  const watchedIds = useMemo(() => new Set(watchedMovies.map((m) => m.imdbID)), [watchedMovies]);
  const filtered = movies.filter((m) => (m.Type || 'movie') === tab && !watchedIds.has(m.imdbID));
  const filteredWatched = watchedMovies.filter((m) => (m.Type || 'movie') === tab);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'movie', label: t('tabMovies') },
    { value: 'series', label: t('tabSeries') },
  ];

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-6">
        <h1 className="text-2xl md:text-3xl text-foreground">{t('watchlist')}</h1>
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

      {/* To watch */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              fluid
              inWatchlist={true}
              inFavourites={favIds.has(movie.imdbID)}
              onToggleWatchlist={() => handleRemove(movie.imdbID)}
              onToggleFavourite={() => toggleFav(movie)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            {tab === 'series'
              ? <Tv size={28} className="text-muted-foreground/40" />
              : <Film size={28} className="text-muted-foreground/40" />}
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {tab === 'series' ? t('emptySeriesHere') : t('emptyMoviesHere')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('emptyHintWatchlist')}</p>
          <Link
            to="/search"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('discoverNow')}
          </Link>
        </div>
      )}

      {/* Watched section */}
      {filteredWatched.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-primary" />
            <h2 className="text-lg text-foreground">{t('watchedSection')}</h2>
            <span className="text-xs text-muted-foreground ml-0.5">({filteredWatched.length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {filteredWatched.map((movie) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                fluid
                isWatched={true}
                onToggleWatched={() => handleUnwatch(movie.imdbID)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
