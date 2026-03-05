import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, BookmarkPlus, BookmarkCheck, CheckCircle2, Check } from 'lucide-react';
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  addToWatched,
  removeFromWatched,
  isWatched,
  type MovieData,
} from '@/lib/db';

interface SearchResultCardProps {
  movie: MovieData;
  onWatchlistChange?: () => void;
  onWatchedChange?: () => void;
  aiReason?: string;
}

export default function SearchResultCard({
  movie,
  onWatchlistChange,
  onWatchedChange,
  aiReason,
}: SearchResultCardProps) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      isInWatchlist(movie.imdbID),
      isWatched(movie.imdbID)
    ]).then(([inList, isWatchedStatus]) => {
      setInWatchlist(inList);
      setWatched(isWatchedStatus);
    });
  }, [movie.imdbID]);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(movie.imdbID);
        setInWatchlist(false);
      } else {
        await addToWatchlist(movie);
        setInWatchlist(true);
      }
      onWatchlistChange?.();
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (watched) {
        await removeFromWatched(movie.imdbID);
        setWatched(false);
      } else {
        await addToWatched(movie);
        setWatched(true);
      }
      onWatchedChange?.();
    } finally {
      setLoading(false);
    }
  };

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const typeLabel = movie.Type === 'series' ? 'Series' : movie.Type === 'episode' ? 'Episode' : 'Movie';

  return (
    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary/60 hover:bg-secondary transition-colors">
      <Link 
        to={movie.Type === 'series' ? `/app/tv/${movie.imdbID}` : `/app/movie/${movie.imdbID}`} 
        className="flex-shrink-0 w-[80px] aspect-[2/3]"
      >
        {poster ? (
          <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Film size={20} className="text-muted-foreground/30" />
          </div>
        )}
      </Link>

      <Link 
        to={movie.Type === 'series' ? `/app/tv/${movie.imdbID}` : `/app/movie/${movie.imdbID}`} 
        className="flex-1 min-w-0 flex items-center px-3"
      >
        <div className="min-w-0 w-full">
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1.5">
            {typeLabel}
          </span>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{movie.Title}</p>
          <p className="text-xs text-muted-foreground mt-1">{movie.Year}</p>
          {aiReason && (
            <p className="text-xs text-muted-foreground/80 italic mt-1.5 line-clamp-2">"{aiReason}"</p>
          )}
        </div>
      </Link>

      <div className="flex flex-col items-center flex-shrink-0">
        {!watched && (
          <button
            onClick={toggleWatchlist}
            disabled={loading}
            className={`p-2.5 flex-1 transition-colors ${inWatchlist
              ? 'text-foreground bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {inWatchlist ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
          </button>
        )}
        {!inWatchlist && (
          <button
            onClick={toggleWatched}
            disabled={loading}
            className={`p-2.5 flex-1 rounded-br-xl transition-colors ${watched
              ? 'text-foreground bg-green-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            } ${!watched ? 'rounded-tr-xl' : ''}`}
          >
            {watched ? <Check size={20} /> : <CheckCircle2 size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}
