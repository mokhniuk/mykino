import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkPlus, BookmarkCheck, Heart, CheckCircle2 } from 'lucide-react';
import type { MovieData } from '@/lib/db';
import { useI18n } from '@/lib/i18n';

interface MovieCardProps {
  movie: MovieData;
  inWatchlist?: boolean;
  inFavourites?: boolean;
  isWatched?: boolean;
  onToggleWatchlist?: () => void;
  onToggleFavourite?: () => void;
  onToggleWatched?: () => void;
  size?: 'sm' | 'md' | 'lg';
  fluid?: boolean;
  progress?: { watched: number; total: number };
}

function MovieCard({
  movie,
  inWatchlist,
  inFavourites,
  isWatched,
  onToggleWatchlist,
  onToggleFavourite,
  onToggleWatched,
  size = 'md',
  fluid = false,
  progress,
}: MovieCardProps) {
  const { t } = useI18n();
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const [imgLoaded, setImgLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-28',
    md: 'w-36 sm:w-40',
    lg: 'w-44 sm:w-48',
  };

  const widthClass = fluid ? 'w-full' : sizeClasses[size];

  return (
    <div
      className={`${widthClass} flex-shrink-0 group animate-fade-in`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' }}
    >
      <Link to={movie.Type === 'series' ? `/app/tv/${movie.imdbID}` : `/app/movie/${movie.imdbID}`} className="block">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
          {poster ? (
            <img
              src={poster}
              alt={movie.Title}
              className={`w-full h-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
              {movie.Title}
            </div>
          )}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
          {isWatched && (
            <div className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-0.5">
              <CheckCircle2 size={14} className="text-primary" />
            </div>
          )}
          {progress && progress.watched > 0 && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-gradient-to-t from-black/75 to-transparent pt-5 px-2 pb-1.5">
                <span className="text-[10px] font-medium text-white/90 leading-none">
                  {progress.watched}{progress.total > 0 ? ` / ${progress.total}` : ''} {t('tvEp')}
                </span>
              </div>
              <div className="h-[3px] bg-white/20">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: progress.total > 0
                      ? `${Math.min(100, (progress.watched / progress.total) * 100)}%`
                      : '100%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-start justify-between gap-1">
        <Link to={movie.Type === 'series' ? `/app/tv/${movie.imdbID}` : `/app/movie/${movie.imdbID}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {movie.Title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{movie.Year}</p>
        </Link>

        {(onToggleWatchlist || onToggleFavourite || onToggleWatched) && (
          <div className="flex gap-0.5 mt-0.5">
            {onToggleWatched && (
              <button
                onClick={(e) => { e.preventDefault(); onToggleWatched(); }}
                className={`p-1.5 rounded transition-colors ${
                  isWatched ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle2 size={18} fill={isWatched ? 'currentColor' : 'none'} />
              </button>
            )}
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

export default memo(MovieCard);
