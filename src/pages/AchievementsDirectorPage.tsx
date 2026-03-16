import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import { getDirectorMovies } from '@/lib/api';
import MovieCard from '@/components/MovieCard';

export default function AchievementsDirectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { watched, directors, isLoading: achievementsLoading } = useAchievements();

  const director = directors.find(d => d.slug === slug);

  const { data: allTmdbMovies = [], isLoading: tmdbLoading } = useQuery({
    queryKey: ['movies', 'director', director?.name, lang],
    queryFn: () => getDirectorMovies(director!.name, lang),
    enabled: !!director?.name,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const watchedIds = useMemo(() => new Set(watched.map(m => m.imdbID)), [watched]);
  const watchedTitles = useMemo(() => new Set(watched.map(m => m.Title.toLowerCase())), [watched]);

  const isWatchedFn = (movie: { imdbID: string; Title: string }) =>
    watchedIds.has(movie.imdbID) || watchedTitles.has(movie.Title.toLowerCase());

  const unwatchedTmdb = useMemo(
    () => allTmdbMovies.filter(m => !isWatchedFn(m)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTmdbMovies, watchedIds, watchedTitles]
  );

  const isLoading = achievementsLoading;

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine">
            <ChevronLeft size={16} />
          </button>
          <div className="h-7 w-48 bg-secondary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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

  if (!director) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine">
            <ChevronLeft size={16} />
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
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine">
          <ChevronLeft size={16} />
        </button>
        <Video size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">{director.name}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {director.movies.length} {t('directorFilmsWatched')}
        {allTmdbMovies.length > 0 && !tmdbLoading && (
          <> · {allTmdbMovies.length} total</>
        )}
      </p>

      {/* Watched films */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('watchedSection')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {director.movies.map(movie => (
            <MovieCard key={movie.imdbID} movie={movie} size="sm" />
          ))}
        </div>
      </section>

      {/* Unwatched films from TMDB */}
      {tmdbLoading ? (
        <section>
          <div className="h-5 w-32 bg-secondary rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {unwatchedTmdb.map(movie => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
