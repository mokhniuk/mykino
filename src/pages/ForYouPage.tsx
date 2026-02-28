import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getPersonalizedRecommendations } from '@/lib/recommendations';
import { type MovieData } from '@/lib/db';
import MovieCard from '@/components/MovieCard';

export default function ForYouPage() {
  const { t, lang } = useI18n();
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPersonalizedRecommendations(lang).then(results => {
      if (cancelled) return;
      setMovies(results);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [lang]);

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 pt-6 md:pt-10 mb-2">
        <ThumbsUp size={24} className="text-primary" />
        <h1 className="text-2xl md:text-3xl text-foreground">{t('forYou')}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{t('forYouBody')}</p>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
              <div className="h-2.5 bg-secondary rounded animate-pulse" />
              <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {movies.map(movie => (
            <MovieCard key={movie.imdbID} movie={movie} fluid />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <ThumbsUp size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('forYou')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('emptyForYouHint')}</p>
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
