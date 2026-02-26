import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Film } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getWatchlist, getSetting, type MovieData } from '@/lib/db';
import ApiKeySetup from '@/components/ApiKeySetup';
import MovieCard from '@/components/MovieCard';

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
}

export default function Index() {
  const { t } = useI18n();
  const greeting = useGreeting();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [watchlist, setWatchlist] = useState<MovieData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getSetting('omdb_api_key').then((key) => setHasApiKey(!!key));
    getWatchlist().then(setWatchlist);
  }, []);

  const todaysPick = useMemo(() => {
    if (watchlist.length === 0) return null;
    const dayIndex = new Date().getDate() % watchlist.length;
    return watchlist[dayIndex];
  }, [watchlist]);

  if (hasApiKey === null) return null;
  if (!hasApiKey) return <ApiKeySetup onKeySet={() => setHasApiKey(true)} />;

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Greeting */}
      <section className="pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl text-foreground mb-1">{greeting} ✨</h1>
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
          <Link
            to={`/movie/${todaysPick.imdbID}`}
            className="block rounded-xl overflow-hidden bg-secondary relative group"
          >
            {todaysPick.Poster && todaysPick.Poster !== 'N/A' ? (
              <div className="relative h-48 md:h-64">
                <img
                  src={todaysPick.Poster}
                  alt={todaysPick.Title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-primary-foreground font-display text-xl">{todaysPick.Title}</p>
                  <p className="text-primary-foreground/70 text-sm">{todaysPick.Year}</p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="font-display text-xl text-foreground">{todaysPick.Title}</p>
                <p className="text-muted-foreground text-sm">{todaysPick.Year}</p>
              </div>
            )}
          </Link>
        </section>
      )}

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
