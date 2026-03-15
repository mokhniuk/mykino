import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers, Lock } from 'lucide-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { getCollectionBySlug, fetchCollectionMovies } from '@/lib/api';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { COLLECTIONS, FREE_COLLECTIONS_LIMIT } from '@/lib/api';
import {
  getWatched, getWatchlist, getFavourites,
  addToWatched, removeFromWatched,
  addToWatchlist, removeFromWatchlist,
  addToFavourites, removeFromFavourites,
  type MovieData,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';

const TYPE_LABELS: Record<string, string> = {
  franchise: 'Franchise', studio: 'Studio', director: 'Director',
  actor: 'Actor', genre: 'Genre', tv: 'TV', decade: 'Decade',
  mood: 'Mood', awards: 'Awards', theme: 'Theme', classics: 'Classics',
};

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { isPro } = useProfile();
  const collection = slug ? getCollectionBySlug(slug) : undefined;
  const collectionIndex = collection ? COLLECTIONS.findIndex(c => c.slug === collection.slug) : -1;
  const isFreeCollection = collectionIndex >= 0 && collectionIndex < FREE_COLLECTIONS_LIMIT;
  const isSignedOut = config.hasSync && !user;
  const isProLocked = config.hasSync && !!user && !isPro && !isFreeCollection;
  const maxPages = collection ? Math.ceil(collection.limit / 20) : 1;

  // ── Collection movies ──────────────────────────────────────────────────────
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['collection', slug, lang],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchCollectionMovies(collection!.slug, collection!.rules, collection!.sort, pageParam as number, lang),
    getNextPageParam: (lastPage, allPages) => {
      const next = allPages.length + 1;
      return next <= Math.min(lastPage.totalPages, maxPages) ? next : undefined;
    },
    enabled: !!collection,
    staleTime: 5 * 60 * 1000,
  });

  const allMovies = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap(p => p.movies)
      .filter(m => { if (seen.has(m.imdbID)) return false; seen.add(m.imdbID); return true; });
  }, [data]);

  // ── User status ────────────────────────────────────────────────────────────
  const { data: userStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['user-status-collection'],
    queryFn: async () => {
      const [watched, watchlist, favourites] = await Promise.all([
        getWatched(), getWatchlist(), getFavourites(),
      ]);
      return { watched, watchlist, favourites };
    },
    staleTime: 30_000,
  });

  const watchedIds = useMemo(
    () => new Set((userStatus?.watched ?? []).map(m => m.imdbID)),
    [userStatus]
  );
  const watchlistIds = useMemo(
    () => new Set((userStatus?.watchlist ?? []).map(m => m.imdbID)),
    [userStatus]
  );
  const favouriteIds = useMemo(
    () => new Set((userStatus?.favourites ?? []).map(m => m.imdbID)),
    [userStatus]
  );

  const refresh = useCallback(() => refetchStatus(), [refetchStatus]);

  const handleToggleWatched = useCallback(async (movie: MovieData) => {
    if (watchedIds.has(movie.imdbID)) await removeFromWatched(movie.imdbID);
    else await addToWatched(movie);
    refresh();
  }, [watchedIds, refresh]);

  const handleToggleWatchlist = useCallback(async (movie: MovieData) => {
    if (watchlistIds.has(movie.imdbID)) await removeFromWatchlist(movie.imdbID);
    else await addToWatchlist(movie);
    refresh();
  }, [watchlistIds, refresh]);

  const handleToggleFavourite = useCallback(async (movie: MovieData) => {
    if (favouriteIds.has(movie.imdbID)) await removeFromFavourites(movie.imdbID);
    else await addToFavourites(movie);
    refresh();
  }, [favouriteIds, refresh]);

  if (!collection) {
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <p className="text-muted-foreground">{t('noResults')}</p>
      </div>
    );
  }

  if (isSignedOut || isProLocked) {
    const title = isSignedOut ? t('collectionsSignInTitle') : t('collectionsProTitle');
    const desc = isSignedOut ? t('collectionsSignInDesc') : t('collectionsProDesc');
    const cta = isSignedOut ? t('collectionsSignInCta') : t('collectionsProCta');
    return (
      <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
        <div className="flex items-center gap-3 pt-6 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine"
          >
            <ChevronLeft size={16} />
          </button>
          <Layers size={22} className="text-primary shrink-0" />
          <h1 className="text-xl font-semibold text-foreground leading-tight">{collection.title}</h1>
        </div>
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock size={24} className="text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{desc}</p>
          <button
            onClick={() => navigate('/app/settings')}
            className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {cta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine"
        >
          <ChevronLeft size={16} />
        </button>
        <Layers size={22} className="text-primary shrink-0" />
        <h1 className="text-xl font-semibold text-foreground leading-tight">{collection.title}</h1>
      </div>

      <div className="flex items-center gap-2 mb-5 pl-0.5 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          {TYPE_LABELS[collection.type] ?? collection.type}
        </span>
        <p className="text-sm text-muted-foreground">{collection.description}</p>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : allMovies.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('noResults')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allMovies.map(movie => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                fluid
                isWatched={watchedIds.has(movie.imdbID)}
                inWatchlist={watchlistIds.has(movie.imdbID)}
                inFavourites={favouriteIds.has(movie.imdbID)}
                onToggleWatched={() => handleToggleWatched(movie)}
                onToggleWatchlist={() => handleToggleWatchlist(movie)}
                onToggleFavourite={() => handleToggleFavourite(movie)}
              />
            ))}
          </div>

          {hasNextPage && !isFetching && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchNextPage()}
                className="px-6 py-2 rounded-xl glass-card text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
              >
                {t('loadMore')}
              </button>
            </div>
          )}

          {isFetching && allMovies.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
