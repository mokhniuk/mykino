import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookmarkPlus, BookmarkCheck, Heart, Star, Clock, CheckCircle2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getMovieDetails } from '@/lib/api';
import {
  isInWatchlist, addToWatchlist, removeFromWatchlist,
  isInFavourites, addToFavourites, removeFromFavourites,
  isWatched, addToWatched, removeFromWatched,
  type MovieData,
} from '@/lib/db';

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavourites, setInFavourites] = useState(false);
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getMovieDetails(id, lang),
      isInWatchlist(id),
      isInFavourites(id),
      isWatched(id),
    ]).then(([data, wl, fv, wd]) => {
      setMovie(data);
      setInWatchlist(wl);
      setInFavourites(fv);
      setWatched(wd);
      setLoading(false);
    });
  }, [id, lang]);

  const toggleWatchlist = async () => {
    if (!movie) return;
    if (inWatchlist) { await removeFromWatchlist(movie.imdbID); }
    else { await addToWatchlist(movie); }
    setInWatchlist(!inWatchlist);
  };

  const toggleFavourite = async () => {
    if (!movie) return;
    if (inFavourites) { await removeFromFavourites(movie.imdbID); }
    else { await addToFavourites(movie); }
    setInFavourites(!inFavourites);
  };

  const toggleWatched = async () => {
    if (!movie) return;
    if (watched) { await removeFromWatched(movie.imdbID); }
    else { await addToWatched(movie); }
    setWatched(!watched);
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
      {/* Hero background — full bleed */}
      {poster && (
        <div className="h-64 md:h-80 overflow-hidden relative">
          <img
            src={poster}
            alt={movie.Title}
            className="w-full h-full object-cover blur-sm scale-110 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background pointer-events-none" />
        </div>
      )}

      {/* Header overlay — same container as body content */}
      <div className={poster ? '-mt-64 md:-mt-80 relative' : ''}>
        <div className="px-4 md:px-6">
          <div className="max-w-4xl mx-auto">

            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="mt-4 p-2 rounded-full glass text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Spacer — pushes title to the bottom of the hero area */}
            {poster && <div className="h-24 md:h-28" />}

            {/* Poster thumbnail + title */}
            <div className="flex gap-4 items-end">
              {poster && (
                <img
                  src={poster}
                  alt={movie.Title}
                  className="w-24 md:w-32 rounded-xl shadow-lg -mb-6 flex-shrink-0"
                  loading="eager"
                />
              )}
              <div className={`min-w-0 ${poster ? 'pb-2' : 'pt-6'}`}>
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
      </div>

      {/* Body content — same container */}
      <div className="px-4 md:px-6">
        <div className="max-w-4xl mx-auto mt-10 md:mt-8 pb-8">

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 md:flex mb-6">
            <button
              onClick={toggleWatchlist}
              className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-3 md:px-4 md:py-2.5 rounded-xl text-sm font-medium transition-colors ${
                inWatchlist
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="flex-shrink-0">{inWatchlist ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}</span>
              <span className="text-[11px] md:text-sm leading-tight text-center">{inWatchlist ? t('removeFromWatchlist') : t('addToWatchlist')}</span>
            </button>
            <button
              onClick={toggleFavourite}
              className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-3 md:px-4 md:py-2.5 rounded-xl text-sm font-medium transition-colors ${
                inFavourites
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="flex-shrink-0"><Heart size={16} fill={inFavourites ? 'currentColor' : 'none'} /></span>
              <span className="text-[11px] md:text-sm leading-tight text-center">{inFavourites ? t('removeFromFavourites') : t('addToFavourites')}</span>
            </button>
            <button
              onClick={toggleWatched}
              className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-3 md:px-4 md:py-2.5 rounded-xl text-sm font-medium transition-colors ${
                watched
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="flex-shrink-0"><CheckCircle2 size={16} fill={watched ? 'currentColor' : 'none'} /></span>
              <span className="text-[11px] md:text-sm leading-tight text-center">{watched ? t('watched') : t('markAsWatched')}</span>
            </button>
          </div>

          {/* Plot */}
          {movie.Plot && movie.Plot !== 'N/A' && (
            <section className="mb-6">
              <h2 className="text-lg text-foreground mb-2">{t('plot')}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{movie.Plot}</p>
            </section>
          )}

          {/* Ratings */}
          {(movie.imdbRating || movie.Metascore) && (
            <div className="flex gap-3 mb-6">
              {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                <div className="p-4 rounded-xl bg-secondary/50 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground mb-1">{t('imdbRating')}</p>
                  <p className="text-2xl font-bold text-primary">{movie.imdbRating}</p>
                  {movie.imdbVotes && <p className="text-xs text-muted-foreground mt-0.5">{movie.imdbVotes} votes</p>}
                </div>
              )}
              {movie.Metascore && movie.Metascore !== 'N/A' && (
                <div className="p-4 rounded-xl bg-secondary/50 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground mb-1">{t('metascore')}</p>
                  <p className="text-2xl font-bold text-foreground">{movie.Metascore}</p>
                </div>
              )}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoItems.map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-sm text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
