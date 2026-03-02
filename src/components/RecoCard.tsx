import { Link } from 'react-router-dom';
import { Film, Star } from 'lucide-react';
import type { MovieData } from '@/lib/db';

export default function RecoCard({ movie, loading }: { movie: MovieData | null; loading?: boolean }) {
  if (loading) return <div className="rounded-xl bg-secondary h-48 animate-pulse" />;
  if (!movie) return null;

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const genres = movie.Genre ? movie.Genre.split(',').slice(0, 2).map(g => g.trim()) : [];

  return (
    <Link
      to={movie.Type === 'series' ? `/app/tv/${movie.imdbID}` : `/app/movie/${movie.imdbID}`}
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
        {genres.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            {genres.map(g => (
              <span key={g} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {g}
              </span>
            ))}
          </div>
        )}
        <p className="font-bold text-foreground text-lg leading-snug line-clamp-2 mb-1.5">{movie.Title}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-auto">
          {movie.Year && <span>{movie.Year}</span>}
          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Star size={11} fill="currentColor" />
              {movie.imdbRating}
            </span>
          )}
        </div>
        {movie.Plot && movie.Plot !== 'N/A' && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2">{movie.Plot}</p>
        )}
      </div>
    </Link>
  );
}
