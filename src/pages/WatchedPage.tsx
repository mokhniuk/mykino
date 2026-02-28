import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getWatched, isInFavourites,
  type MovieData,
} from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Filter = 'all' | 'movie' | 'series';

export default function WatchedPage() {
  const { t, lang } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWatched().then(async (list) => {
      const localized = await Promise.all(
        list.map(m => getMovieDetails(m.imdbID, lang).then(data => data ?? m))
      );
      if (cancelled) return;
      setMovies(localized);
      const fSet = new Set<string>();
      for (const m of list) {
        if (await isInFavourites(m.imdbID)) fSet.add(m.imdbID);
      }
      if (!cancelled) setFavIds(fSet);
    });
    return () => { cancelled = true; };
  }, [lang]);

  const filtered = movies
    .filter((m) => filter === 'all' || (m.Type || 'movie') === filter)
    .filter((m) => !favOnly || favIds.has(m.imdbID));

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-6">
        <h1 className="text-2xl md:text-3xl text-foreground">{t('watchedSection')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={`w-auto h-auto p-2.5 rounded-xl transition-colors ${favOnly ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
          >
            <Heart size={16} fill={favOnly ? 'currentColor' : 'none'} />
          </button>
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
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              fluid
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {filter === 'series' ? t('emptyWatchedSeriesHere') : t('emptyWatchedMoviesHere')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('emptyHintWatched')}</p>
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
