import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Shuffle, Film } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import { computeUnwatchedTop100 } from '@/lib/achievements';
import { TOP_100_MOVIES } from '@/lib/top100';
import RecoCard from '@/components/RecoCard';

export default function AchievementsTop100Page() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { watched, dailyPickMovie, dailyPickLoading, top100Progress, isLoading } = useAchievements();
  const [shuffledId, setShuffledId] = useState<string | null>(null);

  const watchedIds = useMemo(() => new Set(watched.map(m => m.imdbID)), [watched]);
  const watchedTitles = useMemo(() => new Set([
    ...watched.map(m => m.Title.toLowerCase()),
    ...watched.flatMap(m => m.OriginalTitle ? [(m.OriginalTitle as string).toLowerCase()] : []),
  ]), [watched]);

  const unwatched = useMemo(() => computeUnwatchedTop100(watched), [watched]);

  const shuffle = () => {
    if (unwatched.length === 0) return;
    const pool = shuffledId ? unwatched.filter(m => m.imdbID !== shuffledId) : unwatched;
    const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : unwatched[0];
    setShuffledId(pick.imdbID);
  };

  // If user shuffled, find a placeholder pick from the top100 list
  const currentPickMovie = shuffledId
    ? (dailyPickMovie?.imdbID === shuffledId
        ? dailyPickMovie
        : (() => {
            const entry = TOP_100_MOVIES.find(m => m.imdbID === shuffledId);
            return entry ? { imdbID: entry.imdbID, Title: entry.Title, Year: entry.Year, Poster: 'N/A', Type: 'movie' as const } : null;
          })())
    : dailyPickMovie;

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={28} />
        </button>
        <Trophy size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">{t('achievementsTop100')}</h1>
      </div>

      {/* Daily pick + shuffle */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{t('movieOfTheDay')}</p>
          <button
            onClick={shuffle}
            disabled={isLoading || unwatched.length === 0}
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
          >
            <Shuffle size={20} />
          </button>
        </div>
        <RecoCard movie={currentPickMovie} loading={dailyPickLoading && !shuffledId} />
      </div>

      {/* Progress */}
      <p className="text-md text-muted-foreground font-medium tabular-nums mb-2 mt-4">
        {isLoading ? '…' : top100Progress} / 100 {t('top100Unlocked')}
      </p>
      <div className="w-full h-1 bg-secondary rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${top100Progress}%` }}
        />
      </div>

      {/* Full grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {TOP_100_MOVIES.map((movie, index) => {
          const watchedItem = watched.find(w =>
            w.imdbID === movie.imdbID || w.Title.toLowerCase() === movie.Title.toLowerCase()
          );
          const isRevealed = watchedItem
            ? true
            : watchedIds.has(movie.imdbID) || watchedTitles.has(movie.Title.toLowerCase());
          const poster = watchedItem?.Poster && watchedItem.Poster !== 'N/A' ? watchedItem.Poster : null;

          return (
            <Link key={movie.imdbID} to={`/app/movie/${movie.imdbID}`} className="block">
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
                    <span className="absolute top-1 left-1 text-[8px] font-bold bg-black/60 text-white rounded px-1 py-0.5 leading-none tabular-nums">
                      {index + 1}
                    </span>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                ) : (
                  <div className="w-full h-full glass-secondary flex flex-col items-center justify-center gap-1">
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
    </div>
  );
}
