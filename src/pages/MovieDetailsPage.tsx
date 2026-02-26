import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookmarkPlus, BookmarkCheck, Heart, Star, Clock, Calendar,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getMovieDetails } from '@/lib/omdb';
import {
  isInWatchlist, addToWatchlist, removeFromWatchlist,
  isInFavourites, addToFavourites, removeFromFavourites,
  type MovieData,
} from '@/lib/db';

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavourites, setInFavourites] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getMovieDetails(id),
      isInWatchlist(id),
      isInFavourites(id),
    ]).then(([data, wl, fv]) => {
      setMovie(data);
      setInWatchlist(wl);
      setInFavourites(fv);
      setLoading(false);
    });
  }, [id]);

  const toggleWatchlist = async () => {
    if (!movie) return;
    if (inWatchlist) {
      await removeFromWatchlist(movie.imdbID);
    } else {
      await addToWatchlist(movie);
    }
    setInWatchlist(!inWatchlist);
  };

  const toggleFavourite = async () => {
    if (!movie) return;
    if (inFavourites) {
      await removeFromFavourites(movie.imdbID);
    } else {
      await addToFavourites(movie);
    }
    setInFavourites(!inFavourites);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="px-4 pt-8 text-center text-muted-foreground">
        Movie not found
      </div>
    );
  }

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;

  const infoItems = [
    { label: t('director'), value: movie.Director },
    { label: t('writer'), value: movie.Writer },
    { label: t('actors'), value: movie.Actors },
    { label: t('genre'), value: movie.Genre },
    { label: t('rated'), value: movie.Rated },
    { label: t('language'), value: movie.Language },
    { label: t('country'), value: movie.Country },
    { label: t('awards'), value: movie.Awards },
    { label: t('boxOffice'), value: movie.BoxOffice },
  ].filter((i) => i.value && i.value !== 'N/A');

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative">
        {poster && (
          <div className="h-72 md:h-96 overflow-hidden">
            <img
              src={poster}
              alt={movie.Title}
              className="w-full h-full object-cover blur-sm scale-110 opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full glass text-foreground hover:bg-secondary transition-colors z-10"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Poster + Title */}
        <div className={`${poster ? 'absolute bottom-0 left-0 right-0' : 'pt-16'} px-4 md:px-6`}>
          <div className="max-w-4xl mx-auto flex gap-4 items-end">
            {poster && (
              <img
                src={poster}
                alt={movie.Title}
                className="w-28 md:w-36 rounded-lg shadow-lg -mb-6 flex-shrink-0"
              />
            )}
            <div className="pb-2 min-w-0">
              <h1 className="text-2xl md:text-3xl text-foreground leading-tight">{movie.Title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {movie.Year && <span>{movie.Year}</span>}
                {movie.Runtime && movie.Runtime !== 'N/A' && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {movie.Runtime}
                  </span>
                )}
                {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                  <span className="flex items-center gap-1 text-primary">
                    <Star size={12} fill="currentColor" /> {movie.imdbRating}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 md:px-6 max-w-4xl mx-auto mt-10 md:mt-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={toggleWatchlist}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              inWatchlist
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {inWatchlist ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
            {inWatchlist ? t('removeFromWatchlist') : t('addToWatchlist')}
          </button>
          <button
            onClick={toggleFavourite}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              inFavourites
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Heart size={16} fill={inFavourites ? 'currentColor' : 'none'} />
            {inFavourites ? t('removeFromFavourites') : t('addToFavourites')}
          </button>
        </div>

        {/* Plot */}
        {movie.Plot && movie.Plot !== 'N/A' && (
          <section className="mb-6">
            <h2 className="text-lg text-foreground mb-2">{t('plot')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{movie.Plot}</p>
          </section>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {infoItems.map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <p className="text-sm text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Ratings */}
        {(movie.imdbRating || movie.Metascore) && (
          <div className="flex gap-4 mb-8">
            {movie.imdbRating && movie.imdbRating !== 'N/A' && (
              <div className="p-4 rounded-xl bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('imdbRating')}</p>
                <p className="text-2xl font-display text-primary">{movie.imdbRating}</p>
                {movie.imdbVotes && <p className="text-xs text-muted-foreground mt-0.5">{movie.imdbVotes} votes</p>}
              </div>
            )}
            {movie.Metascore && movie.Metascore !== 'N/A' && (
              <div className="p-4 rounded-xl bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('metascore')}</p>
                <p className="text-2xl font-display text-foreground">{movie.Metascore}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
