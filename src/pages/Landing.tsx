import { useEffect, useRef, useState } from 'react';
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
import { searchMovies, getPopular } from '@/lib/api';

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

// ── Floating poster rows for hero background ────────────────────────────────
function FloatingPosters() {
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    getPopular('en', 1)
      .then(movies => {
        setPosters(
          movies
            .filter(m => m.Poster && m.Poster !== 'N/A')
            .map(m => m.Poster as string),
        );
      })
      .catch(() => {});
  }, []);

  if (posters.length < 9) return null;

  const s = Math.ceil(posters.length / 3);
  const rows = [
    { items: posters.slice(0, s),     dir: 'ltr', dur: 38 },
    { items: posters.slice(s, s * 2), dir: 'rtl', dur: 52 },
    { items: posters.slice(s * 2),    dir: 'ltr', dur: 43 },
  ];

  const rowMask = 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="flex flex-col justify-evenly h-full py-14">
        {rows.map(({ items, dir, dur }, i) => (
          <div
            key={i}
            className="overflow-hidden"
            style={{ maskImage: rowMask, WebkitMaskImage: rowMask }}
          >
            <div
              className="flex gap-3"
              style={{
                width: 'max-content',
                animation: `marquee-${dir} ${dur}s linear infinite`,
              }}
            >
              {[...items, ...items].map((url, j) => (
                <img
                  key={j}
                  src={url}
                  alt=""
                  className="w-[68px] h-[102px] rounded-lg object-cover flex-shrink-0 opacity-[0.18]"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* top & bottom fade */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

// ── Shared piece: the left description column inside a bento cell ───────────
function CellDesc({
  step, title, desc, className = '',
}: {
  step: string; title: string; desc: string; className?: string;
}) {
  return (
    <div className={`flex-shrink-0 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/30 mb-1.5 select-none">
        {step}
      </p>
      <h3 className="text-base font-semibold text-foreground leading-snug mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const navigate   = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme }  = useTheme();
  const setupRef   = useRef<HTMLDivElement>(null);

  // Genre three-state: neutral → liked (+) → disliked (×) → neutral
  const [likedGenres,    setLikedGenres]    = useState<Set<number>>(new Set());
  const [dislikedGenres, setDislikedGenres] = useState<Set<number>>(new Set());

  const cycleGenre = (id: number) => {
    if (likedGenres.has(id)) {
      setLikedGenres(s    => { const n = new Set(s); n.delete(id); return n; });
      setDislikedGenres(s => new Set(s).add(id));
    } else if (dislikedGenres.has(id)) {
      setDislikedGenres(s => { const n = new Set(s); n.delete(id); return n; });
    } else {
      setLikedGenres(s => new Set(s).add(id));
    }
  };

  // Watched seeding
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<MovieData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchedIds,    setWatchedIds]    = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await searchMovies(q, 1, lang);
        if (data.Response === 'True' && data.Search) setSearchResults(data.Search.slice(0, 6));
        else setSearchResults([]);
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
        <FloatingPosters />
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

          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {[
              { icon: Lock,    label: t('landingFeaturePrivate')   },
              { icon: WifiOff, label: t('landingFeatureOffline')   },
              { icon: UserX,   label: t('landingFeatureNoAccount') },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full border border-border/60">
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
      <div ref={setupRef} className="max-w-4xl mx-auto px-4 pb-32">

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">{t('landingSetupTitle')}</h2>
          <p className="text-muted-foreground text-sm">{t('landingSetupSubtitle')}</p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* ── 01 Language ── col-span-1: vertical two-part */}
          <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-5">
            <CellDesc
              step="01"
              title={t('landingPickLanguage')}
              desc={t('landingLangDesc')}
            />
            <div className="h-px bg-border" />
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
          </div>

          {/* ── 02 Theme ── col-span-1: vertical two-part */}
          <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-5">
            <CellDesc
              step="02"
              title={t('themeSetting')}
              desc={t('landingThemeDesc')}
            />
            <div className="h-px bg-border" />
            <div className="flex gap-2">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3.5 rounded-xl text-xs font-medium transition-colors ${
                    theme === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 03 Genre preferences ── full-width: horizontal two-part */}
          <div className="rounded-2xl bg-card border border-border p-6 sm:col-span-2">
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">

              {/* Description */}
              <div className="md:w-[200px] lg:w-[220px] flex-shrink-0 md:border-r md:border-border md:pr-8 pb-5 border-b border-border md:pb-0 md:border-b-0">
                <CellDesc
                  step="03"
                  title={t('landingPickGenres')}
                  desc={t('landingGenreDesc')}
                />
                {/* Legend */}
                <div className="flex flex-col gap-1.5 mt-5 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500/70 flex-shrink-0" />
                    {t('include')}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500/70 flex-shrink-0" />
                    {t('exclude')}
                  </span>
                  <span className="italic mt-0.5 text-muted-foreground/40">tap to cycle</span>
                </div>
              </div>

              {/* Interactive: genre chips */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => {
                    const liked    = likedGenres.has(g.id);
                    const disliked = dislikedGenres.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => cycleGenre(g.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
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
              </div>
            </div>
          </div>

          {/* ── 04 Watched history ── full-width: horizontal two-part */}
          <div className="rounded-2xl bg-card border border-border p-6 sm:col-span-2">
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">

              {/* Description */}
              <div className="md:w-[200px] lg:w-[220px] flex-shrink-0 md:border-r md:border-border md:pr-8 pb-5 border-b border-border md:pb-0 md:border-b-0">
                <CellDesc
                  step="04"
                  title={t('landingMarkWatched')}
                  desc={t('landingWatchedDesc')}
                />
                {watchedIds.size > 0 && (
                  <p className="mt-4 text-sm font-medium text-primary">{watchedIds.size} ✓</p>
                )}
              </div>

              {/* Interactive: search + results */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border focus-within:border-primary/40 transition-colors">
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
                  <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
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
              </div>
            </div>
          </div>

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
