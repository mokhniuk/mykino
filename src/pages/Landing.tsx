import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import GB from 'country-flag-icons/react/3x2/GB';
import UA from 'country-flag-icons/react/3x2/UA';
import DE from 'country-flag-icons/react/3x2/DE';
import CZ from 'country-flag-icons/react/3x2/CZ';
import PL from 'country-flag-icons/react/3x2/PL';
import BR from 'country-flag-icons/react/3x2/BR';
import HR from 'country-flag-icons/react/3x2/HR';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronDown, Lock, WifiOff, UserX,
  Search, Loader2, Sun, Moon, Monitor,
  ShieldCheck, Globe, RefreshCw, BarChart2, Heart, Smartphone,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import type { ThemePreference } from '@/lib/theme';
import { addToWatched, setContentPreferences, type MovieData } from '@/lib/db';
import { searchMovies, getPopular } from '@/lib/api';

const GENRES: { id: number; names: Record<Lang, string> }[] = [
  { id: 28,    names: { en: 'Action',        ua: 'Бойовик',        de: 'Action',           cs: 'Akce',            pl: 'Action',        pt: 'Action',      hr: 'Akcija' } },
  { id: 12,    names: { en: 'Adventure',     ua: 'Пригоди',        de: 'Abenteuer',        cs: 'Dobrodružství',   pl: 'Adventure',     pt: 'Adventure',   hr: 'Avantura' } },
  { id: 16,    names: { en: 'Animation',     ua: 'Мультфільм',     de: 'Animation',        cs: 'Animace',         pl: 'Animation',     pt: 'Animation',   hr: 'Animacija' } },
  { id: 35,    names: { en: 'Comedy',        ua: 'Комедія',        de: 'Komödie',          cs: 'Komedie',         pl: 'Comedy',        pt: 'Comedy',      hr: 'Komedija' } },
  { id: 80,    names: { en: 'Crime',         ua: 'Кримінал',       de: 'Krimi',            cs: 'Krimi',           pl: 'Crime',         pt: 'Crime',       hr: 'Kriminal' } },
  { id: 99,    names: { en: 'Documentary',   ua: 'Документальний', de: 'Dokumentarfilm',   cs: 'Dokument',        pl: 'Documentary',   pt: 'Documentary', hr: 'Dokumentarni' } },
  { id: 18,    names: { en: 'Drama',         ua: 'Драма',          de: 'Drama',            cs: 'Drama',           pl: 'Drama',         pt: 'Drama',       hr: 'Drama' } },
  { id: 14,    names: { en: 'Fantasy',       ua: 'Фентезі',        de: 'Fantasy',          cs: 'Fantasy',         pl: 'Fantasy',       pt: 'Fantasy',     hr: 'Fantastika' } },
  { id: 27,    names: { en: 'Horror',        ua: 'Жахи',           de: 'Horror',           cs: 'Horor',           pl: 'Horror',        pt: 'Horror',      hr: 'Horor' } },
  { id: 10749, names: { en: 'Romance',       ua: 'Мелодрама',      de: 'Romanze',          cs: 'Romantika',       pl: 'Romance',       pt: 'Romance',     hr: 'Romantika' } },
  { id: 878,   names: { en: 'Sci-Fi',        ua: 'Фантастика',     de: 'Science-Fiction',  cs: 'Sci-Fi',          pl: 'Sci-Fi',        pt: 'Sci-Fi',      hr: 'Sci-Fi' } },
  { id: 53,    names: { en: 'Thriller',      ua: 'Трилер',         de: 'Thriller',         cs: 'Thriller',        pl: 'Thriller',      pt: 'Thriller',    hr: 'Triler' } },
  { id: 10751, names: { en: 'Family',        ua: 'Сімейний',       de: 'Familie',          cs: 'Rodina',          pl: 'Family',        pt: 'Family',      hr: 'Obiteljski' } },
  { id: 36,    names: { en: 'History',       ua: 'Історичний',     de: 'Geschichte',       cs: 'Historie',        pl: 'History',       pt: 'History',     hr: 'Povijesni' } },
  { id: 9648,  names: { en: 'Mystery',       ua: 'Містика',        de: 'Mystery',          cs: 'Mysteriózní',     pl: 'Mystery',       pt: 'Mystery',     hr: 'Misterij' } },
];

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LANG_OPTIONS: { value: Lang; label: string; Flag: FlagComponent }[] = [
  { value: 'en', label: 'English',    Flag: GB },
  { value: 'ua', label: 'Українська', Flag: UA },
  { value: 'de', label: 'Deutsch',    Flag: DE },
  { value: 'cs', label: 'Čeština',    Flag: CZ },
  { value: 'pl', label: 'Polski',     Flag: PL },
  { value: 'pt', label: 'Português',  Flag: BR },
  { value: 'hr', label: 'Hrvatski',   Flag: HR },
];

// ── Floating poster rows for hero background ────────────────────────────────
// POSTER_SLOT = w-[96px](96) + gap-3(12) = 108px — used to compute animation
// duration so visual speed is consistent regardless of item count.
const POSTER_SLOT = 108;
const ROW_SPEEDS  = [48, 32, 42, 36]; // px/s per row — 4 rows, slow drift
const MAX_POSTERS = 160;              // hard cap — keeps DOM node count bounded

function FloatingPosters({ lang }: { lang: Lang }) {
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    setPosters([]);
    Promise.all([getPopular(lang, 1), getPopular(lang, 2), getPopular(lang, 3), getPopular(lang, 4)])
      .then(pages => {
        const seen = new Set<string>();
        const urls: string[] = [];
        outer: for (const movies of pages) {
          for (const m of movies) {
            if (m.Poster && m.Poster !== 'N/A' && !seen.has(m.Poster)) {
              seen.add(m.Poster);
              urls.push(m.Poster);
              if (urls.length >= MAX_POSTERS) break outer;
            }
          }
        }
        setPosters(urls);
      })
      .catch(() => {});
  }, [lang]);

  if (posters.length < 9) return null;

  const s = Math.ceil(posters.length / 4);
  const rows = [
    { items: posters.slice(0, s),         dir: 'ltr', speed: ROW_SPEEDS[0] },
    { items: posters.slice(s, s * 2),     dir: 'rtl', speed: ROW_SPEEDS[1] },
    { items: posters.slice(s * 2, s * 3), dir: 'ltr', speed: ROW_SPEEDS[2] },
    { items: posters.slice(s * 3),        dir: 'rtl', speed: ROW_SPEEDS[3] },
  ];

  const rowMask = 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="flex flex-col justify-center items-stretch gap-4 h-full">
        {rows.map(({ items, dir, speed }, i) => {
          const dur = Math.round((items.length * POSTER_SLOT) / speed);
          return (
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
                    className="w-[96px] h-[144px] rounded-xl object-cover flex-shrink-0 opacity-[0.18]"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* top & bottom fade */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}


export default function Landing() {
  const navigate   = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme }  = useTheme();
  const setupRef   = useRef<HTMLDivElement>(null);

  // Landing is not part of the PWA — redirect straight to the app.
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      navigate('/app', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [watchedMovies, setWatchedMovies] = useState<MovieData[]>([]);
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
    setWatchedMovies(l => [...l, movie]);
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

    // Encode all setup data as a compact URL token so the app can re-apply it
    // in a different storage context (e.g. iOS PWA after the user adds to home
    // screen — browser and PWA have completely separate storage on iOS).
    // Unicode-safe base64: JSON → UTF-8 bytes → binary string → base64.
    // Plain btoa(JSON.stringify(...)) throws on any non-Latin1 character
    // (e.g. movie titles in Ukrainian, Japanese, Arabic, …).
    const json  = JSON.stringify({
      l:  lang,
      t:  theme,
      lg: [...likedGenres],
      dg: [...dislikedGenres],
      w:  watchedMovies.map(m => ({
        i:  m.imdbID,
        T:  m.Title,
        y:  m.Year,
        p:  m.Poster,
        tp: m.Type,
      })),
    });
    const bytes  = new TextEncoder().encode(json);
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
    const token  = btoa(binary);
    navigate(`/app?_s=${encodeURIComponent(token)}`);
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
        <FloatingPosters lang={lang} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative">
          <img src="/icon-192.png" alt="My Kino" className="w-16 h-16 rounded-2xl shadow-xl mx-auto mb-6" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">My Kino</p>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-5 max-w-lg mx-auto leading-[1.1] tracking-tight">
            {t('landingHeadline')}
          </h1>
          <p className="text-lg text-foreground/70 mb-10 max-w-md mx-auto leading-relaxed">
            {t('landingTagline')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mx-auto w-fit">
            <button
              onClick={handleEnterApp}
              className="px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t('landingEnterApp')} →
            </button>
            <button
              onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-7 py-3.5 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/70 transition-colors whitespace-nowrap"
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
              <span key={label} className="flex items-center gap-1.5 text-xs text-foreground/70 bg-secondary px-3 py-1.5 rounded-full border border-border">
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

      {/* ── Setup sections ──────────────────────────────────────────────── */}
      <div ref={setupRef} className="border-t border-border">

        {/* Intro */}
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-5">
            {t('landingSetupTitle')}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {t('landingSetupSubtitle')}
          </h2>
        </div>

        {/* ── 01 Language — text left · content right ── */}
        <div className="w-full py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-12 lg:gap-24">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">01</p>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
                {t('landingPickLanguage')}
              </h3>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('landingLangDesc')}
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
                {LANG_OPTIONS.map(({ value, label, Flag }) => (
                  <button
                    key={value}
                    onClick={() => setLang(value)}
                    className={`flex flex-row sm:flex-col items-center gap-3 px-4 py-4 sm:py-7 rounded-2xl border-2 transition-all text-left sm:text-center ${
                      lang === value
                        ? 'border-primary bg-primary/8 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <Flag className="w-7 sm:w-9 h-auto rounded-sm flex-shrink-0" />
                    <span className="font-semibold text-sm leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 02 Theme — content left · text right ── */}
        <div className="w-full py-20 lg:py-28 bg-secondary/30">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">02</p>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
                {t('themeSetting')}
              </h3>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('landingThemeDesc')}
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-4 py-8 rounded-2xl border-2 transition-all ${
                      theme === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <Icon size={26} />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 03 Genre preferences — text left · content right ── */}
        <div className="w-full py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start gap-12 lg:gap-24">
            <div className="flex-1 md:sticky md:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">03</p>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
                {t('landingPickGenres')}
              </h3>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('landingGenreDesc')}
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="flex flex-wrap gap-2.5">
                {GENRES.map(g => {
                  const liked    = likedGenres.has(g.id);
                  const disliked = dislikedGenres.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => cycleGenre(g.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        liked
                          ? 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400'
                          : disliked
                          ? 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {liked ? '+ ' : disliked ? '× ' : ''}{g.names[lang]}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500/70 flex-shrink-0" />
                  {t('include')}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500/70 flex-shrink-0" />
                  {t('exclude')}
                </span>
                <span className="italic text-muted-foreground/40">{t('tapToCycle')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 04 Watched history — content left · text right ── */}
        <div className="w-full py-20 lg:py-28 bg-secondary/30">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row-reverse items-start gap-12 lg:gap-24">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-5">04</p>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
                {t('landingMarkWatched')}
              </h3>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('landingWatchedDesc')}
              </p>
              {watchedMovies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {watchedMovies.map(m => {
                    const hasPoster = m.Poster && m.Poster !== 'N/A';
                    return (
                      <div key={m.imdbID} className="relative flex-shrink-0">
                        <div className="w-14 h-[84px] rounded-xl overflow-hidden bg-muted ring-2 ring-primary/40">
                          {hasPoster && (
                            <img src={m.Poster} alt={m.Title} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check size={9} className="text-primary-foreground" strokeWidth={3} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex-1 w-full">
              {/* Search */}
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border focus-within:border-primary/40 transition-colors mb-3">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder={t('searchForMovies')}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {searchLoading && <Loader2 size={15} className="text-muted-foreground animate-spin flex-shrink-0" />}
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {searchResults.map(movie => {
                    const poster  = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
                    const checked = watchedIds.has(movie.imdbID);
                    return (
                      <button
                        key={movie.imdbID}
                        onClick={() => toggleWatched(movie)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                          checked
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-card border border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="w-9 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {poster && <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{movie.Title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{movie.Year}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? 'bg-primary border-primary' : 'border-border'
                        }`}>
                          {checked && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── About / trust section ── */}
        <div className="w-full py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">

            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('infoSectionTitle')}</h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">{t('infoSectionSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('infoPrivacyTitle')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('infoPrivacyDesc')}</p>
              </div>

              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Globe size={20} className="text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('infoTmdbTitle')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('infoTmdbDesc')}</p>
              </div>

              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <RefreshCw size={20} className="text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('infoUpdatesTitle')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('infoUpdatesDesc')}</p>
              </div>

              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <BarChart2 size={20} className="text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('infoAnalyticsTitle')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('infoAnalyticsDesc')}{' '}
                  <a
                    href="https://umami.mokhni.uk/websites/36b2fed3-e325-4e17-b7e1-1fdcfdd3ef1c"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Umami
                  </a>.
                </p>
              </div>
            </div>

            {/* Sponsor banner */}
            <div className="rounded-2xl bg-card border border-border p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">{t('infoSponsorTitle')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('infoSponsorDesc')}</p>
              </div>
              <a
                href="mailto:hello@mykino.app"
                className="flex-shrink-0 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                hello@mykino.app
              </a>
            </div>

          </div>
        </div>

        {/* ── Add to home screen ── */}
        <div className="w-full py-20 lg:py-28 bg-secondary/30">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('landingInstallTitle')}</h3>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t('landingInstallDesc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* iOS */}
              <div className="rounded-2xl bg-card border border-border p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={20} className="text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">{t('landingInstallIos')}</h4>
                </div>
                <ol className="space-y-3">
                  {([t('landingInstallIosStep1'), t('landingInstallIosStep2'), t('landingInstallIosStep3')] as const).map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              {/* Android */}
              <div className="rounded-2xl bg-card border border-border p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={20} className="text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">{t('landingInstallAndroid')}</h4>
                </div>
                <ol className="space-y-3">
                  {([t('landingInstallAndroidStep1'), t('landingInstallAndroidStep2'), t('landingInstallAndroidStep3')] as const).map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="mt-8 text-xs text-muted-foreground/60 text-center max-w-xl mx-auto leading-relaxed">
              {t('landingInstallNote')}
            </p>
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="py-28 px-6 text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-5">{t('landingDoneHeadline')}</h3>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">{t('landingTagline')}</p>
          <button
            onClick={handleEnterApp}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          >
            {t('landingEnterApp')} →
          </button>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear() === 2026 ? '2026' : `2026\u2013${new Date().getFullYear()}`}{' '}
            <span className="text-foreground font-medium">mykino.app</span>
            <span className="opacity-40 ml-2">v{__APP_VERSION__}</span>
          </span>
          <a href="https://mokhniuk.online" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            {t('landingMadeBy')} {t('authorName')}
          </a>
        </div>
      </footer>

    </div>
  );
}
