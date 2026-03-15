import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Film, Heart, ChevronRight,
  ThumbsUp, Layers, Clapperboard, TrendingUp, Flame, Gem,
  Trophy, Video, Medal, Star, Clock, Globe, Languages, Tv2,
  Shuffle, Sparkles, Lock,
  Popcorn, Crown, Zap, Hourglass, Timer, Rewind, CalendarDays, Award, ListOrdered,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getWatchlist, getFavourites, getCachedMovie,
  getSearchHistory,
  type MovieData, type SearchHistoryEntry,
} from '@/lib/db';
import { getMovieDetails, COLLECTIONS, FREE_COLLECTIONS_LIMIT } from '@/lib/api';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useAchievements } from '@/hooks/useAchievements';
import { useTVTracking } from '@/hooks/useTVTracking';
import type { RecoSection } from '@/lib/recommendations';
import { SECTION_SLUGS } from '@/lib/recommendations';
import type { MilestoneId } from '@/lib/achievements';
import type { TVSeriesTracking } from '@/lib/tvTracking';
import MovieCard from '@/components/MovieCard';
import HorizontalScroll from '@/components/HorizontalScroll';
import CollectionCard from '@/components/CollectionCard';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

// ─── Helpers ────────────────────────────────────────────────────────────────

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
}

function formatAge(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days < 30) return null;
  if (days < 60) return '1mo';
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function getNextEpisodeLabel(tracking: TVSeriesTracking): string | null {
  if (tracking.status === 'completed') return null;
  const nonZero = Object.entries(tracking.seasons)
    .filter(([sn]) => Number(sn) > 0)
    .sort(([a], [b]) => Number(a) - Number(b));
  if (nonZero.length === 0) return 'S1 · E1';
  let lastSeason = 1, lastEp = 0;
  for (const [sn, data] of nonZero) {
    if (data.watchedEpisodes.length > 0) {
      lastSeason = Number(sn);
      lastEp = Math.max(...data.watchedEpisodes);
    }
  }
  return `S${lastSeason} · E${lastEp + 1}`;
}

// ─── Section config ──────────────────────────────────────────────────────────

const SECTION_ICONS: Record<RecoSection['id'], React.ReactNode> = {
  becauseLiked: <ThumbsUp size={24} className="text-primary" />,
  byGenre: <Layers size={24} className="text-primary" />,
  nowPlaying: <Clapperboard size={24} className="text-primary" />,
  trending: <TrendingUp size={24} className="text-primary" />,
  popular: <Flame size={24} className="text-primary" />,
  hiddenGems: <Gem size={24} className="text-primary" />,
};

type SectionTitleKey = 'sectionBecauseLiked' | 'sectionByGenre' | 'sectionNowPlaying' | 'sectionTrending' | 'sectionPopular' | 'sectionHiddenGems';

const SECTION_TITLE_KEYS: Record<RecoSection['id'], SectionTitleKey> = {
  becauseLiked: 'sectionBecauseLiked',
  byGenre: 'sectionByGenre',
  nowPlaying: 'sectionNowPlaying',
  trending: 'sectionTrending',
  popular: 'sectionPopular',
  hiddenGems: 'sectionHiddenGems',
};

function RecoSectionHeader({ section }: { section: RecoSection }) {
  const { t } = useI18n();
  const titleKey = SECTION_TITLE_KEYS[section.id];
  const title = section.id === 'becauseLiked' && section.seedTitle
    ? `${t(titleKey)} ${section.seedTitle}`
    : t(titleKey);
  const to = `/app/section/${SECTION_SLUGS[section.id]}`;
  return (
    <div className="flex items-center justify-between mb-3">
      <Link to={to} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {SECTION_ICONS[section.id]}
        <h2 className="text-2xl text-foreground font-semibold leading-tight">{title}</h2>
      </Link>
      <Link to={to} className="text-primary">
        <ChevronRight size={32} />
      </Link>
    </div>
  );
}

const MILESTONE_ICONS: Record<MilestoneId, LucideIcon> = {
  first_film:       Clapperboard,
  ten_films:        Film,
  twenty_five_films:Popcorn,
  fifty_films:      Star,
  hundred_films:    Trophy,
  two_hundred_films:Crown,
  top_contender:    ListOrdered,
  classic:          Clock,
  time_traveller:   Rewind,
  world_explorer:   Globe,
  polyglot:         Languages,
  genre_master:     Layers,
  decade_hopper:    CalendarDays,
  director_devotee: Award,
  binge_day:        Zap,
  epic_viewer:      Hourglass,
  quick_pick:       Timer,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Index() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const greeting = useGreeting();
  const { sections: recoSections, isLoading: recoLoading } = useRecommendations();
  const { watched, directors, milestones, dailyPickMovie, dailyPickLoading, top100Progress, unwatchedTop100, shuffleDailyPick } = useAchievements();
  const { trackingList } = useTVTracking();
  const { user } = useAuth();
  const { isPro } = useProfile();
  // Collections visibility logic:
  // - signed out → hide entirely
  // - signed in + free (managed mode) → 5 free collections + pro teaser
  // - signed in + pro, or community (no Supabase) → all collections
  const collectionsVisible = !!user || !config.hasSync;
  const collectionsProLocked = config.hasSync && !!user && !isPro;

  const trackingMap = useMemo(
    () => Object.fromEntries(trackingList.map(tr => [tr.tvId, tr])),
    [trackingList],
  );
  const watchingShows = trackingList.filter(s => s.status === 'watching');
  const [watchingMovies, setWatchingMovies] = useState<Map<string, MovieData>>(new Map());
  const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([]);
  const [upNextMovies, setUpNextMovies] = useState<MovieData[]>([]);

  useEffect(() => {
    if (watchingShows.length === 0) return;
    Promise.all(
      watchingShows.map(async show => {
        const cached = await getCachedMovie(show.tvId);
        return [show.tvId, cached] as const;
      })
    ).then(results => {
      setWatchingMovies(new Map(results.filter(([, m]) => !!m) as [string, MovieData][]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchingShows.length]);

  useEffect(() => {
    getSearchHistory(6, 0).then(entries => {
      const seen = new Set<string>();
      const unique = entries.filter(e => {
        const key = e.query.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setRecentSearches(unique.slice(0, 4));
    });
  }, []);

  useEffect(() => {
    if (unwatchedTop100.length === 0) return;
    const skip = new Set([dailyPickMovie?.imdbID].filter(Boolean) as string[]);
    const slice = unwatchedTop100.filter(m => !skip.has(m.imdbID)).slice(0, 10);
    Promise.all(slice.map(async m => {
      const cached = await getCachedMovie(m.imdbID);
      return cached ?? { imdbID: m.imdbID, Title: m.Title, Year: m.Year, Poster: 'N/A', Type: 'movie' as const };
    })).then(setUpNextMovies);
  }, [unwatchedTop100, dailyPickMovie?.imdbID]);

  // Stats
  const totalMinutes = useMemo(
    () => watched.reduce((sum, m) => {
      const rt = parseInt(m.Runtime ?? '0', 10);
      return sum + (isNaN(rt) ? 0 : rt);
    }, 0),
    [watched],
  );

  const watchedIds = useMemo(() => new Set(watched.map(m => m.imdbID)), [watched]);
  const watchedTitles = useMemo(() => new Set([
    ...watched.map(m => m.Title.toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]), [watched]);

  const isWatchedFn = (m: { imdbID: string; Title: string }) =>
    watchedIds.has(m.imdbID) || watchedTitles.has(m.Title.toLowerCase());

  const { data: watchlistData, isLoading: watchlistLoading } = useQuery<MovieData[]>({
    queryKey: ['movies', 'watchlist', 'page', lang, watched.length],
    queryFn: async () => {
      const list = await getWatchlist();
      const unwatched = list.filter(m => !isWatchedFn(m));
      return Promise.all(unwatched.slice(0, 10).map(async m => {
        const data = await getMovieDetails(m.imdbID, lang);
        return { ...(data ?? m), addedAt: m.addedAt };
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const localizedWatchlist = watchlistData ?? [];
  const watchlistReady = !watchlistLoading;

  const { data: favouritesData, isLoading: favouritesLoading } = useQuery<MovieData[]>({
    queryKey: ['movies', 'favourites', 'page', lang, watched.length],
    queryFn: async () => {
      const favs = await getFavourites();
      return Promise.all(favs.slice(0, 10).map(m => getMovieDetails(m.imdbID, lang).then(data => data ?? m)));
    },
    staleTime: 5 * 60 * 1000,
  });

  const localizedFavourites = favouritesData ?? [];
  const favouritesReady = !favouritesLoading;

  // #8 — Section ordering: elevate trending when no personalised content
  const orderedSections = useMemo(() => {
    if (recoSections.some(s => s.id === 'becauseLiked')) return recoSections;
    const sorted = [...recoSections];
    const tIdx = sorted.findIndex(s => s.id === 'trending');
    if (tIdx > 0) sorted.unshift(...sorted.splice(tIdx, 1));
    return sorted;
  }, [recoSections]);

  // #1 — Surprise me
  const handleSurpriseMe = useCallback(() => {
    if (localizedWatchlist.length === 0) return;
    const pick = localizedWatchlist[Math.floor(Math.random() * localizedWatchlist.length)];
    navigate(pick.Type === 'series' ? `/app/tv/${pick.imdbID}` : `/app/movie/${pick.imdbID}`);
  }, [localizedWatchlist, navigate]);

  // #5 — New user detection
  const isNewUser = watchlistReady && favouritesReady
    && watched.length === 0
    && localizedWatchlist.length === 0
    && localizedFavourites.length === 0;

  // Directors sorted by most-recently watched movie
  const sortedDirectors = useMemo(
    () => [...directors].sort((a, b) => {
      const aMax = Math.max(...a.movies.map(m => m.addedAt ?? 0));
      const bMax = Math.max(...b.movies.map(m => m.addedAt ?? 0));
      return bMax - aMax;
    }),
    [directors],
  );

  // Next milestone to unlock (closest to completion, not yet unlocked)
  const nextMilestone = useMemo(() => {
    const locked = milestones.filter(m => !m.unlocked);
    if (locked.length === 0) return null;
    const withRatio = locked.map(m => ({
      ...m,
      ratio: m.target ? (m.progress ?? 0) / m.target : 0,
    }));
    return withRatio.sort((a, b) => b.ratio - a.ratio)[0];
  }, [milestones]);

  const skeletonRow = (
    <HorizontalScroll>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-28 flex-shrink-0">
          <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse mb-2" />
          <div className="h-2.5 bg-secondary rounded animate-pulse mb-1.5" />
          <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
        </div>
      ))}
    </HorizontalScroll>
  );

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-8 animate-fade-in">

      {/* ── Greeting ── */}
      <section className="pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground text-sm">{t('readyToWatch')}</p>

        {/* #3 — Stats row */}
        {watched.length > 0 && (
          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {watched.length} <span className="text-muted-foreground font-normal">{t('statWatched').toLowerCase()}</span>
            </span>
            {totalMinutes > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {Math.round(totalMinutes / 60)}<span className="text-muted-foreground font-normal"> {t('hoursWatched')}</span>
                </span>
              </>
            )}
            {directors.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {directors.length} <span className="text-muted-foreground font-normal">{t('statsDirectors')}</span>
                </span>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Search bar ── */}
      <div className="space-y-3">
        <Link to="/app/search" className="block">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card hover:opacity-90 transition-opacity">
            <Search size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('searchForMovies')}</span>
          </div>
        </Link>

        {/* #2 — Recent AI search chips */}
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">{t('jumpBackIn')}:</span>
            {recentSearches.map(entry => (
              <Link
                key={entry.id}
                to={`/app/search?q=${encodeURIComponent(entry.query)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs text-foreground hover:opacity-90 transition-opacity"
              >
                {entry.source === 'chip' && <Sparkles size={10} className="text-primary" />}
                {entry.query}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* #5 — Empty state for new users */}
      {isNewUser && !recoLoading && (
        <section className="rounded-2xl p-5 glass-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t('newUserTitle')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('newUserHint')}</p>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/app/search"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('findAMovie')}
            </Link>
            <Link
              to="/app/settings"
              className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium hover:bg-secondary/70 transition-colors"
            >
              {t('contentSettings')}
            </Link>
          </div>
        </section>
      )}

      {/* #6 — Hero daily pick */}
      {(dailyPickLoading || dailyPickMovie) && (
        <section>
          {dailyPickLoading ? (
            <div className="rounded-2xl bg-secondary animate-pulse h-48" />
          ) : dailyPickMovie ? (
            <div className="relative">
              <Link
                to={dailyPickMovie.Type === 'series' ? `/app/tv/${dailyPickMovie.imdbID}` : `/app/movie/${dailyPickMovie.imdbID}`}
                className="flex items-stretch rounded-2xl overflow-hidden glass-card group hover:opacity-90 transition-opacity relative"
              >
                {/* Blurred poster backdrop */}
                {dailyPickMovie.Poster && dailyPickMovie.Poster !== 'N/A' && (
                  <img
                    src={dailyPickMovie.Poster}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.13] blur-xl scale-110 pointer-events-none select-none"
                  />
                )}

                {/* Big flush poster */}
                <div className="relative flex-shrink-0 w-[28vw] max-w-[160px] aspect-[2/3] overflow-hidden bg-muted">
                  {dailyPickMovie.Poster && dailyPickMovie.Poster !== 'N/A' ? (
                    <img
                      src={dailyPickMovie.Poster}
                      alt={dailyPickMovie.Title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info panel */}
                <div className="relative flex-1 px-4 py-4 min-w-0 flex flex-col overflow-hidden">
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star size={11} className="text-primary" fill="currentColor" />
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">{t('movieOfTheDay')}</span>
                  </div>

                  {/* Genre chips */}
                  {dailyPickMovie.Genre && (
                    <div className="flex gap-1.5 mb-2">
                      {dailyPickMovie.Genre.split(',').slice(0, 2).map(g => (
                        <span key={g} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {g.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="font-bold text-foreground text-lg leading-snug line-clamp-2 mb-1">{dailyPickMovie.Title}</p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-auto">
                    {dailyPickMovie.Year && <span>{dailyPickMovie.Year}</span>}
                    {dailyPickMovie.imdbRating && dailyPickMovie.imdbRating !== 'N/A' && (
                      <span className="flex items-center gap-1 font-medium text-primary">
                        <Star size={11} fill="currentColor" />
                        {dailyPickMovie.imdbRating}
                      </span>
                    )}
                  </div>

                  {dailyPickMovie.Plot && dailyPickMovie.Plot !== 'N/A' && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2">{dailyPickMovie.Plot}</p>
                  )}

                  {/* Top 100 progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground">{t('achievementsTop100')}</span>
                      <span className="text-[10px] font-semibold text-primary tabular-nums">{top100Progress}/100</span>
                    </div>
                    <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${top100Progress}%` }} />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Shuffle button — outside the Link to avoid navigation */}
              <button
                onClick={shuffleDailyPick}
                title={t('shuffle')}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors z-10"
              >
                <Shuffle size={14} />
              </button>
            </div>
          ) : null}
        </section>
      )}

      {/* #4 — Currently Watching TV Shows (with next episode label) */}
      {watchingShows.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <Link to="/app/watchlist" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Tv2 size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('currentlyWatching')}</h2>
            </Link>
            <Link to="/app/watchlist" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>
          <HorizontalScroll>
            {watchingShows.map(show => {
              const movieData = watchingMovies.get(show.tvId) ?? {
                imdbID: show.tvId,
                Title: show.tvId,
                Year: '',
                Poster: 'N/A',
                Type: 'series' as const,
              };
              const nextEp = getNextEpisodeLabel(show);
              return (
                <div key={show.tvId} className="flex-shrink-0 w-28">
                  <MovieCard
                    movie={movieData}
                    size="sm"
                    progress={{ watched: show.totalEpisodesWatched, total: show.numberOfEpisodes ?? 0 }}
                  />
                  {nextEp && (
                    <p className="text-[10px] text-primary font-medium mt-0.5 truncate px-0.5">
                      {t('tvNextEpisode')}: {nextEp}
                    </p>
                  )}
                </div>
              );
            })}
          </HorizontalScroll>
        </section>
      )}

      {/* #1 — Watchlist preview with Surprise me + #7 age hints */}
      {!watchlistReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          {skeletonRow}
        </section>
      ) : localizedWatchlist.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <Link to="/app/watchlist" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Film size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('fromYourWatchlist')}</h2>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSurpriseMe}
                title={t('surpriseMe')}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Shuffle size={18} />
              </button>
              <Link to="/app/watchlist" className="text-primary">
                <ChevronRight size={32} />
              </Link>
            </div>
          </div>
          <HorizontalScroll>
            {localizedWatchlist.map((movie) => {
              const age = formatAge(movie.addedAt);
              return (
                <div key={movie.imdbID} className="flex-shrink-0 w-28">
                  <MovieCard
                    movie={movie}
                    size="sm"
                    progress={movie.Type === 'series' ? (() => {
                      const tr = trackingMap[movie.imdbID];
                      return tr ? { watched: tr.totalEpisodesWatched, total: tr.numberOfEpisodes ?? 0 } : undefined;
                    })() : undefined}
                  />
                  {age && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate px-0.5">{age}</p>
                  )}
                </div>
              );
            })}
          </HorizontalScroll>
        </section>
      ) : null}

      {/* ── Personalized recommendation sections ── */}
      {recoLoading ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          {skeletonRow}
        </section>
      ) : orderedSections.length > 0 ? (
        orderedSections.map(section => (
          <section key={section.id}>
            <RecoSectionHeader section={section} />
            <HorizontalScroll>
              {section.movies.slice(0, 10).map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  size="sm"
                  progress={movie.Type === 'series' ? (() => {
                    const tr = trackingMap[movie.imdbID];
                    return tr ? { watched: tr.totalEpisodesWatched, total: tr.numberOfEpisodes ?? 0 } : undefined;
                  })() : undefined}
                />
              ))}
            </HorizontalScroll>
          </section>
        ))
      ) : null}

      {/* ── Something Familiar (favourites) ── */}
      {!favouritesReady ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          </div>
          {skeletonRow}
        </section>
      ) : localizedFavourites.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <Link to="/app/favourites" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Heart size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('somethingFamiliar')}</h2>
            </Link>
            <Link to="/app/favourites" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>
          <HorizontalScroll>
            {localizedFavourites.map((movie) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                size="sm"
                progress={movie.Type === 'series' ? (() => {
                  const tr = trackingMap[movie.imdbID];
                  return tr ? { watched: tr.totalEpisodesWatched, total: tr.numberOfEpisodes ?? 0 } : undefined;
                })() : undefined}
              />
            ))}
          </HorizontalScroll>
        </section>
      ) : null}

      {/* ── Top 100 Challenge ── */}
      <section className="pb-2">
        <div className="rounded-2xl glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Link to="/app/achievements/top100" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Trophy size={22} className="text-primary" />
              <h2 className="text-xl font-semibold text-foreground">{t('achievementsTop100')}</h2>
            </Link>
            <Link to="/app/achievements/top100" className="text-primary">
              <ChevronRight size={28} />
            </Link>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm text-muted-foreground">{t('top100Unlocked')}</p>
            <p className="text-sm font-semibold text-primary tabular-nums">{top100Progress} / 100</p>
          </div>
          <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${top100Progress}%` }}
            />
          </div>
          {upNextMovies.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2.5">{t('top100UpNext')}</p>
              <HorizontalScroll>
                {upNextMovies.map(movie => (
                  <MovieCard key={movie.imdbID} movie={movie} size="sm" />
                ))}
              </HorizontalScroll>
            </div>
          )}
        </div>
      </section>

      {/* ── Director Collections ── */}
      {directors.length > 0 && (
        <section>
          <div className="flex items-center mb-3">
            <Video size={24} className="text-primary mr-2" />
            <h2 className="text-2xl text-foreground">{t('achievementsDirectors')}</h2>
          </div>
          <HorizontalScroll>
            {sortedDirectors.map(director => {
              const backdropPoster = director.movies.find(m => m.Poster && m.Poster !== 'N/A')?.Poster;
              return (
                <Link
                  key={director.slug}
                  to={`/app/director/${director.slug}`}
                  className="flex-shrink-0 w-44 rounded-xl overflow-hidden glass-card hover:opacity-90 transition-opacity relative"
                >
                  {/* Blurred backdrop */}
                  {backdropPoster && (
                    <img
                      src={backdropPoster}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-[0.12] blur-lg scale-110 pointer-events-none select-none"
                    />
                  )}
                  <div className="relative flex h-[4.5rem] overflow-hidden">
                    {director.movies.slice(0, 3).map((movie, i) => {
                      const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
                      return (
                        <div
                          key={movie.imdbID}
                          className="flex-1 overflow-hidden bg-muted/50"
                          style={{ marginLeft: i > 0 ? '1px' : 0 }}
                        >
                          {poster ? (
                            <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film size={12} className="text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative px-2.5 py-2">
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">{director.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {director.movies.length} {t('directorFilmsWatched')}
                    </p>
                  </div>
                </Link>
              );
            })}
          </HorizontalScroll>
        </section>
      )}

      {/* ── Milestones ── */}
      {watched.length > 0 && (
        <section className="pb-8">
          <div className="flex items-center justify-between mb-3">
            <Link to="/app/achievements/milestones" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Medal size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('achievementsMilestones')}</h2>
            </Link>
            <Link to="/app/achievements/milestones" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>

          {/* Featured: next milestone to unlock */}
          {nextMilestone && (() => {
            const Icon = MILESTONE_ICONS[nextMilestone.id as MilestoneId];
            return (
              <Link to="/app/achievements/milestones" className="block mb-3">
                <div className="rounded-2xl p-4 glass-card hover:opacity-90 transition-opacity">
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">{t('nextToUnlock')}</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl glass-spin flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{t(`milestone_${nextMilestone.id}` as Parameters<typeof t>[0])}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(`milestone_${nextMilestone.id}_desc` as Parameters<typeof t>[0])}</p>
                      {nextMilestone.target && nextMilestone.progress !== undefined && (
                        <div className="mt-2.5">
                          <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700"
                              style={{ width: `${(nextMilestone.progress / nextMilestone.target) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                            {nextMilestone.progress} / {nextMilestone.target}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* All milestones as labelled cards */}
          <HorizontalScroll>
            {milestones.map(milestone => {
              const Icon = MILESTONE_ICONS[milestone.id as MilestoneId];
              return (
                <Link
                  key={milestone.id}
                  to="/app/achievements/milestones"
                  className={`flex-shrink-0 w-28 rounded-xl p-3 glass-card transition-all relative ${
                    milestone.unlocked
                      ? 'ring-1 ring-primary/30 shadow-[0_0_14px_hsl(var(--primary)/0.18)]'
                      : 'opacity-50'
                  }`}
                >
                  {milestone.unlocked && (
                    <div className="absolute top-2 right-2">
                      <Star size={10} className="text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.7)]" fill="currentColor" />
                    </div>
                  )}
                  <Icon size={18} className={milestone.unlocked ? 'text-primary' : 'text-muted-foreground'} />
                  <p className={`text-xs font-medium mt-2 leading-snug line-clamp-2 pr-3 ${milestone.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(`milestone_${milestone.id}` as Parameters<typeof t>[0])}
                  </p>
                  {milestone.target && !milestone.unlocked && milestone.progress !== undefined && milestone.progress > 0 && (
                    <div className="mt-2">
                      <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/50 rounded-full"
                          style={{ width: `${(milestone.progress / milestone.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </HorizontalScroll>
        </section>
      )}

      {/* ── Editorial Collections (signed-in only) ── */}
      {collectionsVisible && (
        <section className="pb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('editorialCollections')}</h2>
              {collectionsProLocked && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock size={9} />Pro
                </span>
              )}
            </div>
            <Link to="/app/collections" className="text-xs text-primary font-medium hover:opacity-70 transition-opacity">
              {t('browseAllCollections')}
            </Link>
          </div>
          <HorizontalScroll>
            {COLLECTIONS.slice(0, collectionsProLocked ? FREE_COLLECTIONS_LIMIT : 20).map(col => (
              <CollectionCard key={col.slug} collection={col} fixedWidth="w-40" />
            ))}
            {collectionsProLocked && (
              <div className="flex-shrink-0 w-40 h-full flex items-center justify-center">
                <button
                  onClick={() => navigate('/app/settings')}
                  className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl glass-card text-center hover:opacity-80 transition-opacity w-full"
                >
                  <Lock size={18} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground">{t('collectionsProCta')}</span>
                </button>
              </div>
            )}
          </HorizontalScroll>
        </section>
      )}
    </div>
  );
}
