import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Video } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import MovieCard from '@/components/MovieCard';

export default function AchievementsDirectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { directors, isLoading } = useAchievements();

  const director = directors.find(d => d.slug === slug);

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={28} />
          </Link>
          <div className="h-7 w-48 bg-secondary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
              <div className="h-2.5 bg-secondary rounded animate-pulse mb-1" />
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
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={28} />
          </Link>
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
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={28} />
        </Link>
        <Video size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">{director.name}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 ml-14">
        {director.movies.length} {t('directorFilmsWatched')}
      </p>

      {/* Film grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {director.movies.map(movie => (
          <MovieCard key={movie.imdbID} movie={movie} size="sm" />
        ))}
      </div>
    </div>
  );
}
