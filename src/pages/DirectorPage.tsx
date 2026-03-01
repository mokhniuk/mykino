import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { getWatched } from '@/lib/db';
import { getDirectorMovies } from '@/lib/api';
import { slugifyDirector } from '@/lib/achievements';
import MovieCard from '@/components/MovieCard';

// Ukrainian has 3 plural forms: 1 / 2-4 / 5+  (with 11-14 exceptions)
function uaPluralFilms(n: number): string {
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return 'фільмів переглянуто';
  if (last1 === 1) return 'фільм переглянуто';
  if (last1 >= 2 && last1 <= 4) return 'фільми переглянуто';
  return 'фільмів переглянуто';
}

export default function DirectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const filmsWatchedLabel = useCallback((n: number): string => {
    if (lang === 'ua') return uaPluralFilms(n);
    return n === 1 ? t('directorFilmsWatched_1') : t('directorFilmsWatched');
  }, [lang, t]);

  const { data: watched = [], isLoading: watchedLoading } = useQuery({
    queryKey: ['watched'],
    queryFn: getWatched,
    staleTime: 60 * 60 * 1000,
  });

  // Resolve the director name by matching slug against watched movies
  const directorName = useMemo(() => {
    if (!slug) return null;
    for (const movie of watched) {
      if (!movie.Director || movie.Director === 'N/A') continue;
      const first = movie.Director.split(',')[0].trim();
      if (slugifyDirector(first) === slug) return first;
    }
    return null;
  }, [watched, slug]);

  const watchedByDirector = useMemo(() => {
    if (!directorName) return [];
    return watched.filter(m => {
      if (!m.Director || m.Director === 'N/A') return false;
      return m.Director.split(',')[0].trim() === directorName;
    });
  }, [watched, directorName]);

  const { data: allTmdbMovies = [], isLoading: tmdbLoading } = useQuery({
    queryKey: ['directorMovies', directorName, lang],
    queryFn: () => getDirectorMovies(directorName!, lang),
    enabled: !!directorName,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const watchedIds = useMemo(() => new Set(watched.map(m => m.imdbID)), [watched]);
  const watchedTitles = useMemo(() => new Set(watched.map(m => m.Title.toLowerCase())), [watched]);

  const unwatchedTmdb = useMemo(
    () => allTmdbMovies.filter(
      m => !watchedIds.has(m.imdbID) && !watchedTitles.has(m.Title.toLowerCase())
    ),
    [allTmdbMovies, watchedIds, watchedTitles]
  );

  if (watchedLoading) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={28} />
          </button>
          <div className="h-7 w-48 bg-secondary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
              <div className="h-2.5 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!directorName) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">{t('achievementsDirectors')}</h1>
        </div>
        <p className="text-muted-foreground">{t('noResults')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-1">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={28} />
        </button>
        <Video size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">{directorName}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8 ml-14">
        {watchedByDirector.length} {filmsWatchedLabel(watchedByDirector.length)}
        {!tmdbLoading && allTmdbMovies.length > 0 && (
          <> · {allTmdbMovies.length} {t('directorTotal')}</>
        )}
      </p>

      {/* Watched films */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('watchedSection')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {watchedByDirector.map(movie => (
            <MovieCard key={movie.imdbID} movie={movie} fluid />
          ))}
        </div>
      </section>

      {/* Unwatched TMDB films */}
      {tmdbLoading ? (
        <section>
          <div className="h-5 w-32 bg-secondary rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
                <div className="h-2.5 bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ) : unwatchedTmdb.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('directorMoreFilms')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {unwatchedTmdb.map(movie => (
              <MovieCard key={movie.imdbID} movie={movie} fluid />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
