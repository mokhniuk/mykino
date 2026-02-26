import { Link } from 'react-router-dom';
import { BookmarkPlus, BookmarkCheck, Heart } from 'lucide-react';
import type { MovieData } from '@/lib/db';

interface MovieCardProps {
  movie: MovieData;
  inWatchlist?: boolean;
  inFavourites?: boolean;
  onToggleWatchlist?: () => void;
  onToggleFavourite?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function MovieCard({
  movie,
  inWatchlist,
  inFavourites,
  onToggleWatchlist,
  onToggleFavourite,
  size = 'md',
}: MovieCardProps) {
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;

  const sizeClasses = {
    sm: 'w-28',
    md: 'w-36 sm:w-40',
    lg: 'w-44 sm:w-48',
  };

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0 group animate-fade-in`}>
      <Link to={`/movie/${movie.imdbID}`} className="block">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
          {poster ? (
            <img
              src={poster}
              alt={movie.Title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
              {movie.Title}
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
        </div>
      </Link>

      <div className="flex items-start justify-between gap-1">
        <Link to={`/movie/${movie.imdbID}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {movie.Title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{movie.Year}</p>
        </Link>

        {(onToggleWatchlist || onToggleFavourite) && (
          <div className="flex gap-0.5 mt-0.5">
            {onToggleWatchlist && (
              <button
                onClick={(e) => { e.preventDefault(); onToggleWatchlist(); }}
                className={`p-1 rounded transition-colors ${
                  inWatchlist ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {inWatchlist ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
              </button>
            )}
            {onToggleFavourite && (
              <button
                onClick={(e) => { e.preventDefault(); onToggleFavourite(); }}
                className={`p-1 rounded transition-colors ${
                  inFavourites ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart size={14} fill={inFavourites ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
