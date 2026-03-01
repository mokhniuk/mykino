import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Film, Heart, ChevronRight,
  ThumbsUp, Layers, Clapperboard, TrendingUp, Flame, Gem,
  Trophy, Video, Medal, Star, Clock, Globe, Languages,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getWatchlist, getWatched, getFavourites, type MovieData } from '@/lib/db';
import { getMovieDetails } from '@/lib/api';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useAchievements } from '@/hooks/useAchievements';
import type { RecoSection } from '@/lib/recommendations';
import { SECTION_SLUGS } from '@/lib/recommendations';
import type { MilestoneId } from '@/lib/achievements';
import MovieCard from '@/components/MovieCard';
import RecoCard from '@/components/RecoCard';

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
}

const SECTION_ICONS: Record<RecoSection['id'], React.ReactNode> = {
  becauseLiked: <ThumbsUp size={24} className="text-primary" />,
  byGenre:      <Layers size={24} className="text-primary" />,
  nowPlaying:   <Clapperboard size={24} className="text-primary" />,
  trending:     <TrendingUp size={24} className="text-primary" />,
  popular:      <Flame size={24} className="text-primary" />,
  hiddenGems:   <Gem size={24} className="text-primary" />,
};

type SectionTitleKey = 'sectionBecauseLiked' | 'sectionByGenre' | 'sectionNowPlaying' | 'sectionTrending' | 'sectionPopular' | 'sectionHiddenGems';

const SECTION_TITLE_KEYS: Record<RecoSection['id'], SectionTitleKey> = {
  becauseLiked: 'sectionBecauseLiked',
  byGenre:      'sectionByGenre',
  nowPlaying:   'sectionNowPlaying',
  trending:     'sectionTrending',
  popular:      'sectionPopular',
  hiddenGems:   'sectionHiddenGems',
};

function RecoSectionHeader({ section }: { section: RecoSection }) {
  const { t } = useI18n();
  const titleKey = SECTION_TITLE_KEYS[section.id];
  const title = section.id === 'becauseLiked' && section.seedTitle
    ? `${t(titleKey)} ${section.seedTitle}`
    : t(titleKey);
  const to = `/section/${SECTION_SLUGS[section.id]}`;
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
  first_film:    Clapperboard,
  ten_films:     Film,
  fifty_films:   Star,
  hundred_films: Trophy,
  classic:       Clock,
  world_explorer:Globe,
  polyglot:      Languages,
  genre_master:  Layers,
};

export default function Index() {
  const { t, lang } = useI18n();
  const greeting = useGreeting();
  const [watchlist, setWatchlist] = useState<MovieData[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [localizedWatchlist, setLocalizedWatchlist] = useState<MovieData[]>([]);
  const [watchlistReady, setWatchlistReady] = useState(false);
  const [localizedFavourites, setLocalizedFavourites] = useState<MovieData[]>([]);
  const [favouritesReady, setFavouritesReady] = useState(false);
  const { sections: recoSections, isLoading: recoLoading } = useRecommendations();
  const { watched, directors, milestones, dailyPickMovie, dailyPickLoading, top100Progress } = useAchievements();

  useEffect(() => {
    Promise.all([getWatchlist(), getWatched()]).then(([wl]) => {
      setWatchlist(wl);
      setDbReady(true);
    });
  }, []);

  const watchedIds = useMemo(() => new Set(watched.map(m => m.imdbID)), [watched]);
  const watchedTitles = useMemo(() => new Set([
    ...watched.map(m => m.Title.toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]), [watched]);

  const isWatchedFn = (m: { imdbID: string; Title: string }) =>
    watchedIds.has(m.imdbID) || watchedTitles.has(m.Title.toLowerCase());

  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    const unwatched = watchlist.filter(m => !isWatchedFn(m));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist, lang, dbReady, watchedIds, watchedTitles]);

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

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Greeting */}
      <section className="pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground text-sm">{t('readyToWatch')}</p>
      </section>

      {/* Search bar */}
      <Link to="/search" className="block">
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
            <Link to="/watchlist" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Film size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('fromYourWatchlist')}</h2>
            </Link>
            <Link to="/watchlist" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {localizedWatchlist.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Personalized recommendation sections */}
      {recoLoading ? (
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
      ) : recoSections.map(section => (
        <section key={section.id}>
          <RecoSectionHeader section={section} />
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {section.movies.slice(0, 10).map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ))}

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
            <Link to="/favourites" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Heart size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('somethingFamiliar')}</h2>
            </Link>
            <Link to="/favourites" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {localizedFavourites.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Top 100 Challenge (compact) ── */}
      <section className="pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link to="/achievements/top100" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Trophy size={24} className="text-primary" />
            <h2 className="text-2xl text-foreground">{t('achievementsTop100')}</h2>
          </Link>
          <Link to="/achievements/top100" className="text-primary">
            <ChevronRight size={32} />
          </Link>
        </div>
        <div className="mb-3">
          <RecoCard movie={dailyPickMovie} loading={dailyPickLoading} />
        </div>
        <p className="text-md text-muted-foreground font-medium tabular-nums mb-2">
          {top100Progress} / 100 {t('top100Unlocked')}
        </p>
        <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${top100Progress}%` }}
          />
        </div>
      </section>

      {/* ── Director Collections ── */}
      {directors.length > 0 && (
        <section>
          <div className="flex items-center mb-3">
            <Video size={24} className="text-primary mr-2" />
            <h2 className="text-2xl text-foreground">{t('achievementsDirectors')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {directors.map(director => (
              <Link
                key={director.slug}
                to={`/director/${director.slug}`}
                className="flex-shrink-0 w-36 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors overflow-hidden"
              >
                {/* Micro-poster thumbnails */}
                <div className="flex h-20 overflow-hidden">
                  {director.movies.slice(0, 3).map((movie, i) => {
                    const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
                    return (
                      <div
                        key={movie.imdbID}
                        className="flex-1 overflow-hidden bg-muted"
                        style={{ marginLeft: i > 0 ? '1px' : 0 }}
                      >
                        {poster ? (
                          <img
                            src={poster}
                            alt={movie.Title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film size={12} className="text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Name + count */}
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">{director.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {director.movies.length} {t('directorFilmsWatched')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Milestones ── */}
      {watched.length > 0 && (
        <section className="pb-8">
          <div className="flex items-center justify-between mb-3">
            <Link to="/achievements/milestones" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Medal size={24} className="text-primary" />
              <h2 className="text-2xl text-foreground">{t('achievementsMilestones')}</h2>
            </Link>
            <Link to="/achievements/milestones" className="text-primary">
              <ChevronRight size={32} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {milestones.map(milestone => {
              const Icon = MILESTONE_ICONS[milestone.id as MilestoneId];
              return (
                <Link
                  key={milestone.id}
                  to="/achievements/milestones"
                  className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border transition-colors ${
                    milestone.unlocked
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-secondary border-border opacity-40'
                  }`}
                >
                  <Icon
                    size={22}
                    className={milestone.unlocked ? 'text-primary' : 'text-muted-foreground'}
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
