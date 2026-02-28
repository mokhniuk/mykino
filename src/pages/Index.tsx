import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Film, Star, Shuffle, Trophy, ChevronRight, Sparkles, Heart, ThumbsUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getWatchlist, getWatched, getFavourites, type MovieData } from '@/lib/db';
import { getMovieDetails, discoverMovies } from '@/lib/api';
import { getPersonalizedRecommendations } from '@/lib/recommendations';
import { TOP_100_MOVIES } from '@/lib/top100';
import MovieCard from '@/components/MovieCard';

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
}

function pickRandom<T>(arr: T[], exclude?: T): T {
  const pool = arr.length > 1 ? arr.filter(x => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function RecoCard({ movie, loading }: { movie: MovieData | null; loading?: boolean }) {
  if (loading) return <div className="rounded-xl bg-secondary h-48 animate-pulse" />;
  if (!movie) return null;

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const genres = movie.Genre ? movie.Genre.split(',').slice(0, 2).map(g => g.trim()) : [];

  return (
    <Link
      to={`/movie/${movie.imdbID}`}
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

function Top100Challenge({
  watchedMovies,
  topPickMovie,
  topPickLoading,
  onShuffle,
}: {
  watchedMovies: MovieData[];
  topPickMovie: MovieData | null;
  topPickLoading: boolean;
  onShuffle: () => void;
}) {
  const { t } = useI18n();

  const watchedIds = useMemo(
    () => new Set(watchedMovies.map(m => m.imdbID)),
    [watchedMovies]
  );
  const watchedTitles = useMemo(
    () => new Set(watchedMovies.map(m => m.Title.toLowerCase())),
    [watchedMovies]
  );

  const revealedCount = useMemo(
    () => TOP_100_MOVIES.filter(m =>
      watchedIds.has(m.imdbID) || watchedTitles.has(m.Title.toLowerCase())
    ).length,
    [watchedIds, watchedTitles]
  );

  return (
    <section className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={24} className="text-primary" />
          <h2 className="text-2xl text-foreground">{t('top100Challenge')}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onShuffle}
            disabled={topPickLoading}
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
          >
            <Shuffle size={24} />
            {/* {t('shuffle')}   */}
          </button>
        </div>
      </div>

      {/* Random unwatched pick */}
      <div className="mb-4">
        <RecoCard movie={topPickMovie} loading={topPickLoading} />
      </div>

      {/* Progress bar */}

      <p className="text-md text-muted-foreground font-medium tabular-nums mb-2">
        {revealedCount} / 100
        {t('top100Unlocked')}
      </p>
      <div className="w-full h-1 bg-secondary rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${revealedCount}%` }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {TOP_100_MOVIES.map((movie, index) => {
          const watchedItem = watchedMovies.find(w =>
            w.imdbID === movie.imdbID || w.Title.toLowerCase() === movie.Title.toLowerCase()
          );
          const isRevealed = !!watchedItem;
          const poster = watchedItem?.Poster && watchedItem.Poster !== 'N/A' ? watchedItem.Poster : null;

          return (
            <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="block">
              <div className="aspect-[2/3] rounded-lg overflow-hidden relative group">
                {isRevealed ? (
                  <>
                    {poster ? (
                      <img
                        src={poster}
                        alt={movie.Title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Film size={12} className="text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Rank badge */}
                    <span className="absolute top-1 left-1 text-[8px] font-bold bg-black/60 text-white rounded px-1 py-0.5 leading-none tabular-nums">
                      {index + 1}
                    </span>
                    {/* Hover tint */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                ) : (
                  <div className="w-full h-full bg-secondary hover:bg-muted transition-colors flex flex-col items-center justify-center gap-1 border border-border/40">
                    <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums leading-none">
                      {index + 1}
                    </span>
                    <span className="text-[9px] text-muted-foreground/25 leading-none">?</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Index() {
  const { t, lang } = useI18n();
  const greeting = useGreeting();
  const [watchlist, setWatchlist] = useState<MovieData[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<MovieData[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [topPickId, setTopPickId] = useState<string>('');
  const [topPickMovie, setTopPickMovie] = useState<MovieData | null>(null);
  const [topPickLoading, setTopPickLoading] = useState(true);
  const [localizedWatchlist, setLocalizedWatchlist] = useState<MovieData[]>([]);
  const [watchlistReady, setWatchlistReady] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<MovieData[]>([]);
  const [discoverReady, setDiscoverReady] = useState(false);
  const [localizedFavourites, setLocalizedFavourites] = useState<MovieData[]>([]);
  const [favouritesReady, setFavouritesReady] = useState(false);
  const [recommendations, setRecommendations] = useState<MovieData[]>([]);
  const [recoReady, setRecoReady] = useState(false);

  useEffect(() => {
    Promise.all([getWatchlist(), getWatched()]).then(([wl, wd]) => {
      setWatchlist(wl);
      setWatchedMovies(wd);
      setDbReady(true);
    });
  }, []);

  const watchedIds = useMemo(
    () => new Set(watchedMovies.map(m => m.imdbID)),
    [watchedMovies]
  );

  // Also index by title (including OriginalTitle) to catch tt↔TMDB-ID mismatches
  const watchedTitles = useMemo(
    () => new Set([
      ...watchedMovies.map(m => m.Title.toLowerCase()),
      ...watchedMovies.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
    ]),
    [watchedMovies]
  );

  const isWatched = useCallback(
    (m: { imdbID: string; Title: string }) =>
      watchedIds.has(m.imdbID) || watchedTitles.has(m.Title.toLowerCase()),
    [watchedIds, watchedTitles]
  );

  const unwatchedTop100 = useMemo(
    () => TOP_100_MOVIES.filter(m => !isWatched(m)),
    [isWatched]
  );

  // Pick initial / re-pick when the current selection becomes watched
  useEffect(() => {
    if (unwatchedTop100.length === 0) return;
    if (!topPickId || !unwatchedTop100.find(m => m.imdbID === topPickId)) {
      setTopPickId(pickRandom(unwatchedTop100).imdbID);
    }
  }, [unwatchedTop100, topPickId]);

  useEffect(() => {
    if (!topPickId) return;
    const entry = TOP_100_MOVIES.find(m => m.imdbID === topPickId);
    if (!entry) return;
    let cancelled = false;
    setTopPickMovie(null);
    setTopPickLoading(true);
    getMovieDetails(entry.imdbID, lang).then((data) => {
      if (cancelled) return;
      setTopPickMovie(data ?? { imdbID: entry.imdbID, Title: entry.Title, Year: entry.Year, Poster: 'N/A', Type: 'movie' });
      setTopPickLoading(false);
    });
    return () => { cancelled = true; };
  }, [topPickId, lang]);

  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    const unwatched = watchlist.filter(m => !isWatched(m));
    if (unwatched.length === 0) {
      setLocalizedWatchlist([]);
      setWatchlistReady(true);
      return;
    }
    Promise.all(
      unwatched.slice(0, 10).map(m => getMovieDetails(m.imdbID, lang).then(data => data ?? m))
    ).then(results => {
      if (!cancelled) {
        setLocalizedWatchlist(results);
        setWatchlistReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [watchlist, lang, isWatched, dbReady]);

  // Something New — discover movies from a genre the user enjoys
  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    const allGenreIds = [...watchedMovies, ...watchlist].flatMap(m => m.genre_ids ?? []);
    const genre = allGenreIds.length > 0 ? allGenreIds[Math.floor(Math.random() * allGenreIds.length)] : null;
    const watchlistIds = new Set(watchlist.map(m => m.imdbID));
    discoverMovies({ genre, lang, page: 1 }).then(res => {
      if (cancelled) return;
      const filtered = (res.Search ?? []).filter(m => !watchedIds.has(m.imdbID) && !watchlistIds.has(m.imdbID));
      setDiscoverResults(filtered.slice(0, 10));
      setDiscoverReady(true);
    });
    return () => { cancelled = true; };
  }, [dbReady, lang, watchedMovies, watchlist]);

  // Something Familiar — user's favourite movies, localized
  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    getFavourites().then(favs => {
      if (cancelled) return;
      if (favs.length === 0) {
        setLocalizedFavourites([]);
        setFavouritesReady(true);
        return;
      }
      Promise.all(
        favs.slice(0, 10).map(m => getMovieDetails(m.imdbID, lang).then(data => data ?? m))
      ).then(results => {
        if (!cancelled) {
          setLocalizedFavourites(results);
          setFavouritesReady(true);
        }
      });
    });
    return () => { cancelled = true; };
  }, [dbReady, lang]);

  // Recommendations — For You
  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    getPersonalizedRecommendations(lang).then(res => {
      if (cancelled) return;
      setRecommendations(res.slice(0, 10));
      setRecoReady(true);
    });
    return () => { cancelled = true; };
  }, [dbReady, lang, watchedMovies, watchlist]);

  const shuffleTopPick = useCallback(() => {
    if (unwatchedTop100.length === 0) return;
    setTopPickId(prev => pickRandom(unwatchedTop100, unwatchedTop100.find(m => m.imdbID === prev)).imdbID);
  }, [unwatchedTop100]);

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Greeting */}
      <section className="pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground text-sm">{t('readyToWatch')}</p>
      </section>

      {/* Search bar */}
      <Link
        to="/search"
        className="block"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-colors">
          <Search size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('searchForMovies')}</span>
        </div>
      </Link>

      {/* Watchlist preview */}
      {!watchlistReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-28 flex-shrink-0">
                <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
                <div className="h-2.5 bg-secondary rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ) : localizedWatchlist.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Film size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('fromYourWatchlist')}</h2>
            </div>
            <Link to="/watchlist" className="text-xs text-primary inline-flex items-baseline">
              <ChevronRight size={32} className="mt-2" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {localizedWatchlist.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Something New */}
      {!discoverReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-28 flex-shrink-0">
                <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
                <div className="h-2.5 bg-secondary rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ) : discoverResults.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('somethingNew')}</h2>
            </div>
            <Link to="/something-new" className="text-xs text-primary inline-flex items-baseline">
              <ChevronRight size={32} className="mt-2" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {discoverResults.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* For You — Personalized Recommendations */}
      {!recoReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-28 flex-shrink-0">
                <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
                <div className="h-2.5 bg-secondary rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ) : recommendations.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ThumbsUp size={24} className="text-primary" />
              <div className="flex flex-col">
                <h2 className="text-2xl text-foreground font-semibold leading-tight">{t('forYou')}</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t('forYouBody')}</p>
              </div>
            </div>
            <Link to="/for-you" className="text-xs text-primary inline-flex items-baseline">
              <ChevronRight size={32} className="mt-2" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {recommendations.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Something Familiar */}
      {!favouritesReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-28 flex-shrink-0">
                <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
                <div className="h-2.5 bg-secondary rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ) : localizedFavourites.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('somethingFamiliar')}</h2>
            </div>
            <Link to="/favourites" className="text-xs text-primary inline-flex items-baseline">
              <ChevronRight size={32} className="mt-2" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {localizedFavourites.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Top 100 Challenge (includes random pick) */}
      <Top100Challenge
        watchedMovies={watchedMovies}
        topPickMovie={topPickMovie}
        topPickLoading={topPickLoading}
        onShuffle={shuffleTopPick}
      />
    </div>
  );
}
