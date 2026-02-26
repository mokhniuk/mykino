import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Film, Star, Shuffle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getWatchlist, type MovieData } from '@/lib/db';
import { getMovieDetails } from '@/lib/api';
import { TOP_100_MOVIES } from '@/lib/top100';
import MovieCard from '@/components/MovieCard';

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
}

function randomIndex(exclude?: number) {
  let idx: number;
  do { idx = Math.floor(Math.random() * TOP_100_MOVIES.length); } while (idx === exclude);
  return idx;
}

function RecoCard({ movie, loading }: { movie: MovieData | null; loading?: boolean }) {
  if (loading) return <div className="rounded-xl bg-secondary h-48 animate-pulse" />;
  if (!movie) return null;

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const genres = movie.Genre ? movie.Genre.split(',').slice(0, 2).map(g => g.trim()) : [];

  return (
    <Link
      to={`/movie/${movie.imdbID}`}
      className="flex items-stretch rounded-xl overflow-hidden bg-secondary group hover:bg-secondary/80 transition-colors"
    >
      {/* Poster — flush left/top/bottom, drives card height */}
      <div className="flex-shrink-0 w-[28vw] max-w-[200px] aspect-[2/3] overflow-hidden bg-muted">
        {poster ? (
          <img
            src={poster}
            alt={movie.Title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={24} className="text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 px-4 py-4 min-w-0 flex flex-col overflow-hidden">
        {/* Genre tags */}
        {genres.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            {genres.map(g => (
              <span key={g} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className="font-bold text-foreground text-lg leading-snug line-clamp-2 mb-1.5">{movie.Title}</p>

        {/* Year + Rating */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-auto">
          {movie.Year && <span>{movie.Year}</span>}
          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Star size={11} fill="currentColor" />
              {movie.imdbRating}
            </span>
          )}
        </div>

        {/* Plot */}
        {movie.Plot && movie.Plot !== 'N/A' && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2">{movie.Plot}</p>
        )}
      </div>
    </Link>
  );
}

export default function Index() {
  const { t, lang } = useI18n();
  const greeting = useGreeting();
  const [watchlist, setWatchlist] = useState<MovieData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [topPickIdx, setTopPickIdx] = useState(() => randomIndex());
  const [topPickMovie, setTopPickMovie] = useState<MovieData | null>(null);
  const [topPickLoading, setTopPickLoading] = useState(false);

  useEffect(() => {
    getWatchlist().then(setWatchlist);
  }, []);

  useEffect(() => {
    const entry = TOP_100_MOVIES[topPickIdx];
    setTopPickMovie(null);
    setTopPickLoading(true);
    getMovieDetails(entry.imdbID, lang).then((data) => {
      setTopPickMovie(data ?? { imdbID: entry.imdbID, Title: entry.Title, Year: entry.Year, Poster: 'N/A', Type: 'movie' });
      setTopPickLoading(false);
    });
  }, [topPickIdx, lang]);

  const shuffleTopPick = useCallback(() => {
    setTopPickIdx((i) => randomIndex(i));
  }, []);

  const todaysPick = useMemo(() => {
    if (watchlist.length === 0) return null;
    const dayIndex = new Date().getDate() % watchlist.length;
    return watchlist[dayIndex];
  }, [watchlist]);

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Greeting */}
      <section className="pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground text-sm">{t('readyToWatch')}</p>
      </section>

      {/* Search bar */}
      <Link
        to={`/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
        className="block"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-colors">
          <Search size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('searchForMovies')}</span>
        </div>
      </Link>

      {/* Today's pick */}
      {todaysPick && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary" />
            <h2 className="text-lg text-foreground">{t('todaysPick')}</h2>
          </div>
          <RecoCard movie={todaysPick} />
        </section>
      )}

      {/* Top rated pick */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-primary" />
            <h2 className="text-lg text-foreground">{t('topRatedPick')}</h2>
          </div>
          <button
            onClick={shuffleTopPick}
            disabled={topPickLoading}
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
          >
            <Shuffle size={13} />
            {t('shuffle')}
          </button>
        </div>
        <RecoCard movie={topPickMovie} loading={topPickLoading} />
      </section>

      {/* Watchlist preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film size={16} className="text-primary" />
            <h2 className="text-lg text-foreground">{t('fromYourWatchlist')}</h2>
          </div>
          {watchlist.length > 0 && (
            <Link to="/watchlist" className="text-xs text-primary hover:underline">
              {t('watchlist')} →
            </Link>
          )}
        </div>
        {watchlist.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {watchlist.slice(0, 10).map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-secondary/50">
            <p className="text-muted-foreground text-sm">{t('noWatchlistYet')}</p>
            <p className="text-muted-foreground/60 text-xs mt-1">{t('addMoviesToWatchlist')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
