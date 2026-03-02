import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Star, ChevronDown, ChevronUp, Tv2, Play,
  CheckCircle2, Heart, BookmarkPlus, BookmarkCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getTVShowDetails, getTVSeasonDetail,
  type TVShowDetail, type TVSeasonDetail, STILL_BASE,
} from '@/lib/tmdbTV';
import { useTVTracking } from '@/hooks/useTVTracking';
import { computeProgress, type TVSeriesTracking } from '@/lib/tvTracking';
import {
  cacheMovie, isInWatchlist, addToWatchlist, removeFromWatchlist,
  isInFavourites, addToFavourites, removeFromFavourites,
  addToWatched, removeFromWatched,
  type MovieData,
} from '@/lib/db';

export default function TVShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();
  const { trackingList, updateTracking } = useTVTracking();

  const [showDetail, setShowDetail] = useState<TVShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavourites, setInFavourites] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [seasonDetails, setSeasonDetails] = useState<Record<number, TVSeasonDetail | null>>({});
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());

  const tracking = trackingList.find(t => t.tvId === id);
  const isCompleted = tracking?.status === 'completed';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setShowDetail(null);
    setExpandedSeasons(new Set());
    setSeasonDetails({});
    Promise.all([
      getTVShowDetails(id, lang),
      isInWatchlist(id),
      isInFavourites(id),
    ]).then(([detail, wl, fv]) => {
      setShowDetail(detail);
      setInWatchlist(wl);
      setInFavourites(fv);
      setLoading(false);
      if (detail) {
        cacheMovie({
          imdbID: id,
          Title: detail.title,
          Year: detail.year,
          Poster: detail.poster ?? 'N/A',
          Type: 'series',
          imdbRating: detail.rating,
          Genre: detail.genres,
          Plot: detail.overview,
          Director: detail.creator,
          Actors: detail.cast,
          Language: detail.language,
          Country: detail.country,
          TrailerKey: detail.trailerKey,
        });
      }
    });
  }, [id, lang]);

  const buildMovieData = (): MovieData => ({
    imdbID: id!,
    Title: showDetail!.title,
    Year: showDetail!.year,
    Poster: showDetail!.poster ?? 'N/A',
    Type: 'series',
    imdbRating: showDetail!.rating,
    Genre: showDetail!.genres,
    Plot: showDetail!.overview,
  });

  const handleToggleWatchlist = async () => {
    if (!showDetail) return;
    if (inWatchlist) {
      await removeFromWatchlist(id!);
      setInWatchlist(false);
    } else {
      await addToWatchlist(buildMovieData());
      setInWatchlist(true);
    }
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  const handleMarkCompleted = async () => {
    if (!showDetail) return;
    const current = getOrCreateTracking();
    await updateTracking({ ...current, status: 'completed', lastWatchedAt: Date.now() });
    await addToWatched(buildMovieData());
    queryClient.invalidateQueries({ queryKey: ['watched'] });
    if (inWatchlist) {
      await removeFromWatchlist(id!);
      setInWatchlist(false);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }
  };

  const handleUnmarkCompleted = async () => {
    const current = getOrCreateTracking();
    await updateTracking({ ...current, status: 'watching', lastWatchedAt: Date.now() });
    await removeFromWatched(id!);
    queryClient.invalidateQueries({ queryKey: ['watched'] });
    await addToWatchlist(buildMovieData());
    setInWatchlist(true);
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  const toggleFavourite = async () => {
    if (!showDetail) return;
    if (inFavourites) {
      await removeFromFavourites(id!);
      setInFavourites(false);
    } else {
      await addToFavourites(buildMovieData());
      setInFavourites(true);
    }
    queryClient.invalidateQueries({ queryKey: ['favourites'] });
  };

  const toggleSeasonExpand = async (seasonNum: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      next.has(seasonNum) ? next.delete(seasonNum) : next.add(seasonNum);
      return next;
    });
    if (!(seasonNum in seasonDetails)) {
      setLoadingSeasons(prev => new Set(prev).add(seasonNum));
      const detail = await getTVSeasonDetail(id!, seasonNum, lang);
      setSeasonDetails(prev => ({ ...prev, [seasonNum]: detail }));
      setLoadingSeasons(prev => {
        const next = new Set(prev);
        next.delete(seasonNum);
        return next;
      });
    }
  };

  const getOrCreateTracking = (): TVSeriesTracking => tracking ?? {
    tvId: id!,
    status: 'planned',
    seasons: {},
    totalEpisodesWatched: 0,
    lastWatchedAt: Date.now(),
  };

  const handleToggleEpisode = async (seasonNum: number, episodeNum: number) => {
    const current = getOrCreateTracking();
    const seasonData = current.seasons[seasonNum] ?? { watchedEpisodes: [] };
    const isWatchedEp = seasonData.watchedEpisodes.includes(episodeNum);

    const newWatchedEpisodes = isWatchedEp
      ? seasonData.watchedEpisodes.filter(ep => ep !== episodeNum)
      : [...seasonData.watchedEpisodes, episodeNum];

    const newSeasons = { ...current.seasons, [seasonNum]: { watchedEpisodes: newWatchedEpisodes } };
    const totalWatched = Object.entries(newSeasons)
      .filter(([sn]) => Number(sn) > 0)
      .reduce((sum, [, d]) => sum + d.watchedEpisodes.length, 0);

    const progress = computeProgress({ ...current, seasons: newSeasons }, showDetail?.seasons ?? []);

    let newStatus: TVSeriesTracking['status'] = current.status;
    if (progress.total > 0 && progress.watched === progress.total) {
      newStatus = 'completed';
    } else if (isWatchedEp && current.status === 'completed') {
      newStatus = 'watching';
    } else if (!isWatchedEp && current.status === 'planned') {
      newStatus = 'watching';
    }

    await updateTracking({
      ...current,
      seasons: newSeasons,
      totalEpisodesWatched: totalWatched,
      status: newStatus,
      lastWatchedAt: Date.now(),
    });

    if (newStatus === 'completed' && current.status !== 'completed') {
      await addToWatched(buildMovieData());
      queryClient.invalidateQueries({ queryKey: ['watched'] });
    } else if (newStatus !== 'completed' && current.status === 'completed') {
      await removeFromWatched(id!);
      queryClient.invalidateQueries({ queryKey: ['watched'] });
    }
  };

  const handleMarkAllInSeason = async (seasonNum: number, episodeCount: number, markAll: boolean) => {
    const current = getOrCreateTracking();
    const newWatchedEpisodes = markAll
      ? Array.from({ length: episodeCount }, (_, i) => i + 1)
      : [];

    const newSeasons = { ...current.seasons, [seasonNum]: { watchedEpisodes: newWatchedEpisodes } };
    const totalWatched = Object.entries(newSeasons)
      .filter(([sn]) => Number(sn) > 0)
      .reduce((sum, [, d]) => sum + d.watchedEpisodes.length, 0);

    const progress = computeProgress({ ...current, seasons: newSeasons }, showDetail?.seasons ?? []);

    let newStatus: TVSeriesTracking['status'] = current.status;
    if (progress.total > 0 && progress.watched === progress.total) {
      newStatus = 'completed';
    } else if (!markAll && current.status === 'completed') {
      newStatus = 'watching';
    } else if (markAll && current.status === 'planned') {
      newStatus = 'watching';
    }

    await updateTracking({
      ...current,
      seasons: newSeasons,
      totalEpisodesWatched: totalWatched,
      status: newStatus,
      lastWatchedAt: Date.now(),
    });

    if (newStatus === 'completed' && current.status !== 'completed') {
      await addToWatched(buildMovieData());
      queryClient.invalidateQueries({ queryKey: ['watched'] });
    } else if (newStatus !== 'completed' && current.status === 'completed') {
      await removeFromWatched(id!);
      queryClient.invalidateQueries({ queryKey: ['watched'] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!showDetail) {
    return <div className="px-4 pt-8 text-center text-muted-foreground">Show not found</div>;
  }

  const poster = showDetail.poster;
  const progress = tracking
    ? computeProgress(tracking, showDetail.seasons)
    : { total: showDetail.numberOfEpisodes, watched: 0, nextEpisode: null };
  const progressPct = progress.total > 0 ? (progress.watched / progress.total) * 100 : 0;

  const visibleSeasons = showDetail.seasons.filter(s => {
    if (s.season_number === 0) {
      return (tracking?.seasons[0]?.watchedEpisodes.length ?? 0) > 0;
    }
    return true;
  });

  const infoItems = [
    { label: t('director'), value: showDetail.creator },
    { label: t('actors'), value: showDetail.cast },
    { label: t('genre'), value: showDetail.genres },
    { label: t('language'), value: showDetail.language },
    { label: t('country'), value: showDetail.country },
    { label: t('released'), value: showDetail.year },
  ].filter(i => i.value);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      {poster && (
        <div className="h-64 md:h-80 overflow-hidden relative">
          <img
            src={poster}
            alt={showDetail.title}
            className="w-full h-full object-cover blur-sm scale-110 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background pointer-events-none" />
        </div>
      )}

      <div className={poster ? '-mt-64 md:-mt-80 relative' : ''}>
        <div className="px-4 md:px-6">
          <div className="max-w-4xl mx-auto">

            {/* Back + Favourites — same as MovieDetailsPage */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full glass text-foreground hover:bg-secondary transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onClick={toggleFavourite}
                className={`p-2 rounded-full glass transition-colors ${
                  inFavourites ? 'text-destructive' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Heart size={24} fill={inFavourites ? 'currentColor' : 'none'} />
              </button>
            </div>

            {poster && <div className="h-20" />}

            {/* Poster + title */}
            <div className="flex gap-4 items-start">
              {poster ? (
                <img
                  src={poster}
                  alt={showDetail.title}
                  className="w-24 md:w-32 rounded-xl shadow-lg -mb-6 flex-shrink-0"
                  loading="eager"
                />
              ) : (
                <div className="w-24 md:w-32 aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Tv2 size={32} className="text-muted-foreground/40" />
                </div>
              )}
              <div className={`min-w-0 ${poster ? 'pb-2' : 'pt-6'}`}>
                <h1 className="text-2xl md:text-3xl text-foreground leading-tight">{showDetail.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  {showDetail.year && <span>{showDetail.year}</span>}
                  {showDetail.rating && (
                    <span className="flex items-center gap-1 text-primary">
                      <Star size={12} fill="currentColor" /> {showDetail.rating}
                    </span>
                  )}
                  {showDetail.showStatus && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {showDetail.showStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 md:px-6">
        <div className="max-w-4xl mx-auto mt-10 md:mt-8 pb-8 space-y-6">

          {/* Action buttons — same animated layout as MovieDetailsPage */}
          <div className="relative h-[42px] w-full">
            {/* Not-completed state */}
            <div className={`flex gap-3 w-full transition-all duration-500 ${
              isCompleted ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}>
              <button
                onClick={handleToggleWatchlist}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden whitespace-nowrap ${
                  inWatchlist
                    ? 'w-[42px] bg-secondary text-primary'
                    : 'flex-1 bg-primary text-primary-foreground hover:opacity-90'
                }`}
                title={inWatchlist ? t('removeFromWatchlist') : t('addToWatchlist')}
              >
                {inWatchlist
                  ? <BookmarkCheck size={24} className="flex-shrink-0" />
                  : <><BookmarkPlus size={24} className="flex-shrink-0" /><span>{t('addToWatchlist')}</span></>
                }
              </button>

              <button
                onClick={handleMarkCompleted}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden whitespace-nowrap ${
                  inWatchlist
                    ? 'flex-1 bg-primary text-primary-foreground hover:opacity-90'
                    : 'w-[42px] bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                title={t('tvStatus_completed')}
              >
                <CheckCircle2 size={24} className="flex-shrink-0" />
                {inWatchlist && <span>{t('tvStatus_completed')}</span>}
              </button>
            </div>

            {/* Completed state */}
            <div className={`absolute inset-0 transition-all duration-500 ${
              isCompleted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
            }`}>
              <button
                onClick={handleUnmarkCompleted}
                className="w-full h-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-colors"
              >
                <CheckCircle2 size={24} className="text-primary" />
                {t('tvStatus_completed')}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {tracking && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {progress.watched} / {progress.total} {t('tvEpisodesWatched')}
                </span>
                {tracking.status === 'watching' && progress.nextEpisode && (
                  <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                    <Play size={10} fill="currentColor" />
                    {t('tvNextEpisode')}: S{progress.nextEpisode.season}E{progress.nextEpisode.episode}
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Season list — at the top, before description */}
          <div className="space-y-2">
            {visibleSeasons.map(season => {
              const isExpanded = expandedSeasons.has(season.season_number);
              const isLoadingSeason = loadingSeasons.has(season.season_number);
              const detail = seasonDetails[season.season_number];
              const watchedInSeason = tracking?.seasons[season.season_number]?.watchedEpisodes.length ?? 0;
              const seasonPct = season.episode_count > 0 ? (watchedInSeason / season.episode_count) * 100 : 0;
              const allWatched = season.episode_count > 0 && watchedInSeason === season.episode_count;
              const seasonName = season.season_number === 0
                ? t('tvSpecials')
                : `${t('tvSeason')} ${season.season_number}`;

              return (
                <div key={season.season_number} className="rounded-xl bg-secondary/50 overflow-hidden">
                  {/* Season header */}
                  <button
                    onClick={() => toggleSeasonExpand(season.season_number)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-foreground">{seasonName}</span>
                        <span className="text-xs text-muted-foreground">
                          {watchedInSeason}/{season.episode_count}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-background/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${seasonPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {/* Season body */}
                  {isExpanded && (
                    <div className="border-t border-border/30">
                      <div className="flex justify-end px-4 py-2.5">
                        <button
                          onClick={() => handleMarkAllInSeason(season.season_number, season.episode_count, !allWatched)}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          {allWatched ? t('tvUnmarkAll') : t('tvMarkAllWatched')}
                        </button>
                      </div>

                      {isLoadingSeason ? (
                        <div className="px-4 pb-4 space-y-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-24 md:w-32 aspect-video rounded-lg bg-secondary animate-pulse flex-shrink-0" />
                              <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
                                <div className="h-3 bg-secondary rounded animate-pulse w-1/3" />
                                <div className="h-3 bg-secondary rounded animate-pulse" />
                                <div className="h-3 bg-secondary rounded animate-pulse w-4/5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : detail === null ? (
                        <p className="px-4 pb-4 text-sm text-muted-foreground">{t('tvNoEpisodeData')}</p>
                      ) : detail ? (
                        <div className="divide-y divide-border/20">
                          {detail.episodes.map(ep => {
                            const isEpWatched =
                              tracking?.seasons[season.season_number]?.watchedEpisodes.includes(ep.episode_number) ?? false;

                            return (
                              <div key={ep.episode_number} className="flex gap-3 px-4 py-3">
                                {/* Thumbnail */}
                                <button
                                  onClick={() => handleToggleEpisode(season.season_number, ep.episode_number)}
                                  className="relative flex-shrink-0 w-24 md:w-32 aspect-video rounded-lg overflow-hidden bg-secondary"
                                >
                                  {ep.still_path ? (
                                    <img
                                      src={`${STILL_BASE}${ep.still_path}`}
                                      alt={ep.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-xs font-mono text-muted-foreground/40">
                                        E{ep.episode_number}
                                      </span>
                                    </div>
                                  )}
                                  {isEpWatched && (
                                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                      <CheckCircle2 size={22} className="text-primary" />
                                    </div>
                                  )}
                                </button>

                                {/* Episode info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className={`text-sm font-semibold leading-snug ${isEpWatched ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        <span className="text-muted-foreground font-normal text-xs mr-1">
                                          {ep.episode_number}.
                                        </span>
                                        {ep.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                        {ep.air_date && <span>{ep.air_date}</span>}
                                        {ep.runtime && <span>· {ep.runtime}m</span>}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleToggleEpisode(season.season_number, ep.episode_number)}
                                      className="flex-shrink-0 mt-0.5 transition-colors"
                                      aria-label={isEpWatched ? 'Mark unwatched' : 'Mark watched'}
                                    >
                                      <CheckCircle2
                                        size={20}
                                        className={isEpWatched ? 'text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground'}
                                        fill={isEpWatched ? 'currentColor' : 'none'}
                                      />
                                    </button>
                                  </div>
                                  {ep.overview && (
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">
                                      {ep.overview}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overview */}
          {showDetail.overview && (
            <section>
              <h2 className="text-lg text-foreground mb-2">{t('plot')}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{showDetail.overview}</p>
            </section>
          )}

          {/* Trailer */}
          {showDetail.trailerKey && (
            <section>
              <h2 className="text-lg text-foreground mb-2">{t('trailer')}</h2>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-secondary/30">
                <iframe
                  src={`https://www.youtube.com/embed/${showDetail.trailerKey}`}
                  title={`${showDetail.title} Trailer`}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Rating */}
          {showDetail.rating && (
            <div className="flex gap-3">
              <div className="p-4 rounded-xl bg-secondary/50 text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1">{t('imdbRating')}</p>
                <p className="text-2xl font-bold text-primary">{showDetail.rating}</p>
                {showDetail.voteCount && (
                  <p className="text-xs text-muted-foreground mt-0.5">{showDetail.voteCount} votes</p>
                )}
              </div>
            </div>
          )}

          {/* Metadata grid */}
          {infoItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoItems.map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
