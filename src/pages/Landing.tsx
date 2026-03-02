import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronDown, Lock, WifiOff, UserX,
  Globe, Palette, Layers, Search, Loader2,
  Sun, Moon, Monitor,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import type { ThemePreference } from '@/lib/theme';
import { addToWatched, setContentPreferences, type MovieData } from '@/lib/db';
import { searchMovies } from '@/lib/api';

const GENRES: { id: number; names: Record<Lang, string> }[] = [
  { id: 28,    names: { en: 'Action',        ua: 'Бойовик',        de: 'Action',           cs: 'Akce' } },
  { id: 12,    names: { en: 'Adventure',     ua: 'Пригоди',        de: 'Abenteuer',        cs: 'Dobrodružství' } },
  { id: 16,    names: { en: 'Animation',     ua: 'Мультфільм',     de: 'Animation',        cs: 'Animace' } },
  { id: 35,    names: { en: 'Comedy',        ua: 'Комедія',        de: 'Komödie',          cs: 'Komedie' } },
  { id: 80,    names: { en: 'Crime',         ua: 'Кримінал',       de: 'Krimi',            cs: 'Krimi' } },
  { id: 99,    names: { en: 'Documentary',   ua: 'Документальний', de: 'Dokumentarfilm',   cs: 'Dokument' } },
  { id: 18,    names: { en: 'Drama',         ua: 'Драма',          de: 'Drama',            cs: 'Drama' } },
  { id: 14,    names: { en: 'Fantasy',       ua: 'Фентезі',        de: 'Fantasy',          cs: 'Fantasy' } },
  { id: 27,    names: { en: 'Horror',        ua: 'Жахи',           de: 'Horror',           cs: 'Horor' } },
  { id: 10749, names: { en: 'Romance',       ua: 'Мелодрама',      de: 'Romanze',          cs: 'Romantika' } },
  { id: 878,   names: { en: 'Sci-Fi',        ua: 'Фантастика',     de: 'Science-Fiction',  cs: 'Sci-Fi' } },
  { id: 53,    names: { en: 'Thriller',      ua: 'Трилер',         de: 'Thriller',         cs: 'Thriller' } },
  { id: 10751, names: { en: 'Family',        ua: 'Сімейний',       de: 'Familie',          cs: 'Rodina' } },
  { id: 36,    names: { en: 'History',       ua: 'Історичний',     de: 'Geschichte',       cs: 'Historie' } },
  { id: 9648,  names: { en: 'Mystery',       ua: 'Містика',        de: 'Mystery',          cs: 'Mysteriózní' } },
];

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'en', label: 'English',    flag: '🇬🇧' },
  { value: 'ua', label: 'Українська', flag: '🇺🇦' },
  { value: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { value: 'cs', label: 'Čeština',    flag: '🇨🇿' },
];

// ── Bento cell wrapper ──────────────────────────────────────────────────────
function BentoCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card border border-border p-5 ${className}`}>
      {children}
    </div>
  );
}

function CellHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-primary flex-shrink-0" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const setupRef = useRef<HTMLDivElement>(null);

  // Genre three-state: neutral → liked (green) → disliked (red) → neutral
  const [likedGenres, setLikedGenres]       = useState<Set<number>>(new Set());
  const [dislikedGenres, setDislikedGenres] = useState<Set<number>>(new Set());

  const cycleGenre = (id: number) => {
    if (likedGenres.has(id)) {
      setLikedGenres(s => { const n = new Set(s); n.delete(id); return n; });
      setDislikedGenres(s => new Set(s).add(id));
    } else if (dislikedGenres.has(id)) {
      setDislikedGenres(s => { const n = new Set(s); n.delete(id); return n; });
    } else {
      setLikedGenres(s => new Set(s).add(id));
    }
  };

  // Watched seeding
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<MovieData[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [watchedIds, setWatchedIds]         = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await searchMovies(q, 1, lang);
        if (data.Response === 'True' && data.Search) {
          setSearchResults(data.Search.slice(0, 6));
        } else {
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const toggleWatched = async (movie: MovieData) => {
    if (watchedIds.has(movie.imdbID)) return;
    await addToWatched(movie);
    setWatchedIds(s => new Set(s).add(movie.imdbID));
  };

  const handleEnterApp = async () => {
    if (likedGenres.size > 0 || dislikedGenres.size > 0) {
      await setContentPreferences({
        liked_genres:       [...likedGenres],
        disliked_genres:    [...dislikedGenres],
        liked_countries:    [],
        disliked_countries: [],
        liked_languages:    [],
        disliked_languages: [],
      });
    }
    localStorage.setItem('hasSeenLanding', 'true');
    navigate('/app');
  };

  const themeOptions: { value: ThemePreference; icon: React.ElementType; label: string }[] = [
    { value: 'light',  icon: Sun,     label: t('lightMode')  },
    { value: 'system', icon: Monitor, label: t('systemMode') },
    { value: 'dark',   icon: Moon,    label: t('darkMode')   },
  ];

  return (
    <div className="bg-background min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative">
          <img src="/icon-192.png" alt="My Kino" className="w-16 h-16 rounded-2xl shadow-xl mx-auto mb-6" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">My Kino</p>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-5 max-w-lg mx-auto leading-[1.1] tracking-tight">
            {t('landingHeadline')}
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
            {t('landingTagline')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
            <button
              onClick={handleEnterApp}
              className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              {t('landingEnterApp')} →
            </button>
            <button
              onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex-1 py-3.5 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/70 transition-colors"
            >
              {t('landingGetStarted')}
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {[
              { icon: Lock,    label: t('landingFeaturePrivate')   },
              { icon: WifiOff, label: t('landingFeatureOffline')   },
              { icon: UserX,   label: t('landingFeatureNoAccount') },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full border border-border/60"
              >
                <Icon size={11} />
                {label}
              </span>
            ))}
          </div>

          <button
            onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-12 text-muted-foreground/40 hover:text-muted-foreground transition-colors animate-bounce mx-auto block"
            aria-label="Scroll down"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </section>

      {/* ── Bento setup grid ─────────────────────────────────────────────── */}
      <div ref={setupRef} className="max-w-2xl mx-auto px-4 pb-32">

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">{t('landingSetupTitle')}</h2>
          <p className="text-muted-foreground text-sm">{t('landingSetupSubtitle')}</p>
        </div>

        {/* Bento grid — 2 cols on sm+, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* ── Language ── */}
          <BentoCell>
            <CellHeader icon={Globe} title={t('landingPickLanguage')} />
            <div className="grid grid-cols-2 gap-2">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    lang === opt.value
                      ? 'bg-primary/10 border-primary'
                      : 'bg-secondary/50 border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-lg leading-none">{opt.flag}</span>
                  <span className={`font-medium text-sm ${lang === opt.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </BentoCell>

          {/* ── Theme ── */}
          <BentoCell>
            <CellHeader icon={Palette} title={t('themeSetting')} />
            <div className="flex gap-2">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors ${
                    theme === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </BentoCell>

          {/* ── Genre preferences (full width) ── */}
          <BentoCell className="sm:col-span-2">
            <CellHeader icon={Layers} title={t('landingPickGenres')} />
            <p className="text-xs text-muted-foreground mb-4 -mt-2">{t('landingPickGenresHint')}</p>

            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => {
                const liked    = likedGenres.has(g.id);
                const disliked = dislikedGenres.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => cycleGenre(g.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      liked
                        ? 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400'
                        : disliked
                        ? 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    {liked ? '+ ' : disliked ? '× ' : ''}{g.names[lang]}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500/70" />
                {t('include')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/70" />
                {t('exclude')}
              </span>
              <span className="italic">tap to cycle</span>
            </div>
          </BentoCell>

          {/* ── Watched history (full width) ── */}
          <BentoCell className="sm:col-span-2">
            <CellHeader icon={Check} title={t('landingMarkWatched')} />
            <p className="text-xs text-muted-foreground mb-4 -mt-2">{t('landingMarkWatchedHint')}</p>

            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border focus-within:border-primary/40 transition-colors mb-3">
              <Search size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('searchForMovies')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {searchLoading && <Loader2 size={14} className="text-muted-foreground animate-spin flex-shrink-0" />}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {searchResults.map(movie => {
                  const poster  = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
                  const checked = watchedIds.has(movie.imdbID);
                  return (
                    <button
                      key={movie.imdbID}
                      onClick={() => toggleWatched(movie)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                        checked
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-secondary/50 border border-transparent hover:border-border'
                      }`}
                    >
                      <div className="w-8 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {poster && <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{movie.Title}</p>
                        <p className="text-xs text-muted-foreground">{movie.Year}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {checked && <Check size={11} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {watchedIds.size > 0 && (
              <p className="text-xs text-primary mt-3 font-medium">{watchedIds.size} ✓</p>
            )}
          </BentoCell>

        </div>

        {/* ── Final CTA ── */}
        <div className="text-center mt-12 pt-12 border-t border-border">
          <h3 className="text-2xl font-bold text-foreground mb-2">{t('landingDoneHeadline')}</h3>
          <p className="text-sm text-muted-foreground mb-7">{t('landingTagline')}</p>
          <button
            onClick={handleEnterApp}
            className="w-full max-w-xs py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity mx-auto block"
          >
            {t('landingEnterApp')} →
          </button>
        </div>
      </div>
    </div>
  );
}
