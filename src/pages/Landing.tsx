import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import GB from 'country-flag-icons/react/3x2/GB';
import UA from 'country-flag-icons/react/3x2/UA';
import DE from 'country-flag-icons/react/3x2/DE';
import CZ from 'country-flag-icons/react/3x2/CZ';
import PL from 'country-flag-icons/react/3x2/PL';
import BR from 'country-flag-icons/react/3x2/BR';
import HR from 'country-flag-icons/react/3x2/HR';
import IT from 'country-flag-icons/react/3x2/IT';
import ES from 'country-flag-icons/react/3x2/ES';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronDown, Lock, WifiOff, UserX,
  Search, Loader2, Sun, Moon, Monitor,
  ShieldCheck, Globe, RefreshCw, BarChart2, Heart, Smartphone, Sparkles,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import type { ThemePreference } from '@/lib/theme';
import { addToWatched, setContentPreferences, type MovieData } from '@/lib/db';
import { searchMovies, getPopular, getMovieDetails } from '@/lib/api';
import { TOP_100_MOVIES } from '@/lib/top100';
import type { TopMovie } from '@/lib/top100';

const GENRES: { id: number; names: Record<Lang, string> }[] = [
  { id: 28,    names: { en: 'Action',        ua: 'Бойовик',        de: 'Action',           cs: 'Akce',            pl: 'Action',        pt: 'Action',      hr: 'Akcija',      it: 'Azione' } },
  { id: 12,    names: { en: 'Adventure',     ua: 'Пригоди',        de: 'Abenteuer',        cs: 'Dobrodružství',   pl: 'Adventure',     pt: 'Adventure',   hr: 'Avantura',    it: 'Avventura' } },
  { id: 16,    names: { en: 'Animation',     ua: 'Мультфільм',     de: 'Animation',        cs: 'Animace',         pl: 'Animation',     pt: 'Animation',   hr: 'Animacija',   it: 'Animazione' } },
  { id: 35,    names: { en: 'Comedy',        ua: 'Комедія',        de: 'Komödie',          cs: 'Komedie',         pl: 'Comedy',        pt: 'Comedy',      hr: 'Komedija',    it: 'Commedia' } },
  { id: 80,    names: { en: 'Crime',         ua: 'Кримінал',       de: 'Krimi',            cs: 'Krimi',           pl: 'Crime',         pt: 'Crime',       hr: 'Kriminal',    it: 'Crimine' } },
  { id: 99,    names: { en: 'Documentary',   ua: 'Документальний', de: 'Dokumentarfilm',   cs: 'Dokument',        pl: 'Documentary',   pt: 'Documentary', hr: 'Dokumentarni', it: 'Documentario' } },
  { id: 18,    names: { en: 'Drama',         ua: 'Драма',          de: 'Drama',            cs: 'Drama',           pl: 'Drama',         pt: 'Drama',       hr: 'Drama',       it: 'Dramma' } },
  { id: 14,    names: { en: 'Fantasy',       ua: 'Фентезі',        de: 'Fantasy',          cs: 'Fantasy',         pl: 'Fantasy',       pt: 'Fantasy',     hr: 'Fantastika',  it: 'Fantasy' } },
  { id: 27,    names: { en: 'Horror',        ua: 'Жахи',           de: 'Horror',           cs: 'Horor',           pl: 'Horror',        pt: 'Horror',      hr: 'Horor',       it: 'Horror' } },
  { id: 10749, names: { en: 'Romance',       ua: 'Мелодрама',      de: 'Romanze',          cs: 'Romantika',       pl: 'Romance',       pt: 'Romance',     hr: 'Romantika',   it: 'Romantico' } },
  { id: 878,   names: { en: 'Sci-Fi',        ua: 'Фантастика',     de: 'Science-Fiction',  cs: 'Sci-Fi',          pl: 'Sci-Fi',        pt: 'Sci-Fi',      hr: 'Sci-Fi',      it: 'Fantascienza' } },
  { id: 53,    names: { en: 'Thriller',      ua: 'Трилер',         de: 'Thriller',         cs: 'Thriller',        pl: 'Thriller',      pt: 'Thriller',    hr: 'Triler',      it: 'Thriller' } },
  { id: 10751, names: { en: 'Family',        ua: 'Сімейний',       de: 'Familie',          cs: 'Rodina',          pl: 'Family',        pt: 'Family',      hr: 'Obiteljski',  it: 'Famiglia' } },
  { id: 36,    names: { en: 'History',       ua: 'Історичний',     de: 'Geschichte',       cs: 'Historie',        pl: 'History',       pt: 'History',     hr: 'Povijesni',   it: 'Storia' } },
  { id: 9648,  names: { en: 'Mystery',       ua: 'Містика',        de: 'Mystery',          cs: 'Mysteriózní',     pl: 'Mystery',       pt: 'Mystery',     hr: 'Misterij',    it: 'Mistero' } },
];

function sampleN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LANG_OPTIONS: { value: Lang; label: string; Flag: FlagComponent }[] = [
  { value: 'en', label: 'English',    Flag: GB },
  { value: 'ua', label: 'Українська', Flag: UA },
  { value: 'de', label: 'Deutsch',    Flag: DE },
  { value: 'cs', label: 'Čeština',    Flag: CZ },
  { value: 'pl', label: 'Polski',     Flag: PL },
  { value: 'pt', label: 'Português',  Flag: BR },
  { value: 'hr', label: 'Hrvatski',   Flag: HR },
  { value: 'it', label: 'Italiano',   Flag: IT },
  { value: 'es', label: 'Español',    Flag: ES },
];

// ── Sphere poster background ─────────────────────────────────────────────────
// Viewer sits at the origin, sphere surface at radius 1.
// POSTER_W / POSTER_H are angular sizes in sphere-radius units.
// GAP is the physical gap between neighbours on the sphere surface.
// At rz=1 (directly ahead) a poster appears focal*POSTER_W pixels wide.
const POSTER_W  = 0.18; // width  in sphere-radius units
const POSTER_H  = 0.27; // height (2:3 portrait ratio)
const GAP       = 0.07; // physical gap between covers on sphere surface
const MAX_PAGES = 7;    // pages to load progressively

/**
 * Latitude-band tiling: divides the sphere into horizontal rings sized so every
 * poster has the same angular footprint and the same gap between neighbours.
 * Bands are stored equator-first so the most-visible slots get images soonest.
 */
function buildSphereGrid() {
  const dPhi   = POSTER_H + GAP;
  const nBands = Math.floor(Math.PI / dPhi);
  // Reorder bands equator → poles so equatorial positions (most visible) get
  // the first poster URLs assigned during progressive load.
  const order = Array.from({ length: nBands }, (_, i) => i)
    .sort((a, b) => Math.abs(a - (nBands - 1) / 2) - Math.abs(b - (nBands - 1) / 2));

  const positions: { x: number; y: number; z: number }[] = [];
  for (const b of order) {
    const phi  = -Math.PI / 2 + (b + 0.5) * dPhi;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const n    = Math.max(1, Math.round((2 * Math.PI * cosP) / (POSTER_W + GAP)));
    const off  = (b & 1) ? Math.PI / n : 0; // stagger alternate rows
    for (let i = 0; i < n; i++) {
      const theta = off + (2 * Math.PI * i) / n;
      positions.push({ x: cosP * Math.cos(theta), y: sinP, z: cosP * Math.sin(theta) });
    }
  }
  return positions;
}

// Pre-computed once; ~130 slots for the chosen constants.
const SPHERE_POSITIONS = buildSphereGrid();

function FloatingPosters({ lang }: { lang: Lang }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Images stored in a ref so the render loop picks up new arrivals each frame
  // without re-triggering the animation effect.
  const imgsRef   = useRef<({ img: HTMLImageElement; loadedAt: number } | null)[]>([]);
  const [ready, setReady] = useState(false);

  // Load pages one-by-one; images start painting in as soon as each page arrives.
  useEffect(() => {
    let cancelled = false;
    imgsRef.current = [];
    setReady(false);
    let isReady = false;

    (async () => {
      for (let page = 1; page <= MAX_PAGES; page++) {
        if (cancelled) break;
        try {
          const movies = await getPopular(lang, page);
          if (cancelled) break;
          for (const m of movies) {
            if (!m.Poster || m.Poster === 'N/A') continue;
            const idx = imgsRef.current.length;
            imgsRef.current.push(null);
            const img = new Image();
            img.onload = () => { imgsRef.current[idx] = { img, loadedAt: performance.now() }; };
            img.src = m.Poster;
          }
          if (!isReady && imgsRef.current.length >= 9) {
            isReady = true;
            if (!cancelled) setReady(true);
          }
        } catch { /* network errors are non-fatal */ }
      }
    })();

    return () => { cancelled = true; };
  }, [lang]);

  // Single animation loop — deps only on [ready] so progressive image arrivals
  // never restart the loop; the loop reads imgsRef.current every frame.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);

    let angle = 0;
    let rafId = 0;

    const draw = () => {
      const W   = canvas.width;
      const H   = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx || W === 0 || H === 0) { rafId = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      // Slow Y-axis spin + gentle X wobble
      angle += 0.0008;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt  = Math.sin(angle * 0.17) * 0.12;
      const cosT  = Math.cos(tilt);
      const sinT  = Math.sin(tilt);

      const cx    = W / 2;
      const cy    = H / 2;
      // focal = how many pixels wide a poster at rz=1 (dead-ahead) will be / POSTER_W.
      // 0.60 × H gives ~97px wide covers with 38px gaps at center (≈2rem).
      const focal = Math.min(W, H) * 0.60;
      const imgs  = imgsRef.current;

      const now   = performance.now();
      type PItem = { entry: { img: HTMLImageElement; loadedAt: number } | null; rx: number; ry: number; rz: number };
      const items: PItem[] = SPHERE_POSITIONS.map((p, i) => {
        const rx  = p.x * cosA - p.z * sinA;        // Y-axis spin
        const rz0 = p.x * sinA + p.z * cosA;
        const ry  = p.y * cosT - rz0 * sinT;         // X-axis wobble
        const rz  = p.y * sinT + rz0 * cosT;
        return { entry: imgs[i] ?? null, rx, ry, rz };
      });

      // Painter's algorithm: from inside the sphere every poster is on the surface at radius 1.
      // Draw low-rz posters first (they're at the visual periphery in screen space)
      // so that the central, high-rz posters render on top of any screen-space overlap.
      items.sort((a, b) => a.rz - b.rz);

      items.forEach(({ entry, rx, ry, rz }) => {
        // Only render the forward hemisphere; rz < 0.15 produces extreme fish-eye distortion.
        if (!entry || rz < 0.15) return;

        // Inside-sphere perspective projection.
        // The viewer is at the origin, the poster sits on the sphere at depth = rz
        // (the z-component of its unit-sphere position is its effective pinhole depth).
        // scale = focal / rz: posters near the edge (rz→0) appear enormous — that IS
        // the correct spherical-interior look (they curve away from you).
        const scale = focal / rz;
        const sx    = cx + rx * scale;
        const sy    = cy - ry * scale;
        const sw    = POSTER_W * scale;
        const sh    = POSTER_H * scale;

        // Positional fade + per-image load fade (800 ms ramp from transparent).
        const loadFade = Math.min(1, (now - entry.loadedAt) / 800);
        const alpha = Math.max(0, (rz - 0.15) / 0.85) * 0.50 * loadFade;
        const img   = entry.img;

        ctx.save();
        ctx.globalAlpha = alpha;
        const x = sx - sw / 2;
        const y = sy - sh / 2;
        const radius = sw * 0.07;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, sw, sh, radius);
        } else {
          const r = Math.min(radius, sw / 2, sh / 2);
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + sw - r, y);
          ctx.quadraticCurveTo(x + sw, y, x + sw, y + r);
          ctx.lineTo(x + sw, y + sh - r);
          ctx.quadraticCurveTo(x + sw, y + sh, x + sw - r, y + sh);
          ctx.lineTo(x + r, y + sh);
          ctx.quadraticCurveTo(x, y + sh, x, y + sh - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.clip();
        ctx.drawImage(img, x, y, sw, sh);
        ctx.restore();
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Helmet visor frame — background colour with elliptical hole cut via CSS mask */}
      <div
        className="absolute inset-0"
        style={{
          background: 'hsl(var(--background))',
          maskImage: 'radial-gradient(ellipse 74% 64% at 50% 50%, transparent 52%, black 74%)',
          WebkitMaskImage: 'radial-gradient(ellipse 74% 64% at 50% 50%, transparent 52%, black 74%)',
        }}
      />
      {/* Soft inner vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 74% 64% at 50% 50%, transparent 38%, hsl(var(--background) / 0.55) 54%, transparent 76%)',
        }}
      />
    </div>
  );
}


export default function Landing() {
  const navigate   = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme }  = useTheme();
  const setupRef     = useRef<HTMLDivElement>(null);
  const heroRef      = useRef<HTMLElement>(null);
  const finalCtaRef  = useRef<HTMLButtonElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  // Landing is not part of the PWA — redirect straight to the app.
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      navigate('/app', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Floating CTA: visible after hero leaves, hidden once the final CTA enters viewport.
  useEffect(() => {
    const hero = heroRef.current;
    const cta  = finalCtaRef.current;
    if (!hero || !cta) return;
    let heroVisible = true;
    let ctaVisible  = false;
    const update = () => setShowFloating(!heroVisible && !ctaVisible);
    const heroObs = new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); });
    const ctaObs  = new IntersectionObserver(([e]) => { ctaVisible  = e.isIntersecting; update(); });
    heroObs.observe(hero);
    ctaObs.observe(cta);
    return () => { heroObs.disconnect(); ctaObs.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Genre three-state: neutral → liked (+) → disliked (×) → neutral
  const [langOpen, setLangOpen] = useState(false);

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

  // ── Top-100 suggestion slots ─────────────────────────────────────────────
  const [slotState, setSlotState] = useState<{ slots: TopMovie[]; pool: TopMovie[] }>(() => {
    const shuffled = [...TOP_100_MOVIES].sort(() => Math.random() - 0.5);
    return { slots: shuffled.slice(0, 5), pool: shuffled.slice(5) };
  });
  const [slotData, setSlotData] = useState<Record<string, MovieData>>({});

  useEffect(() => {
    setSlotData({});
    slotState.slots.forEach(m => {
      getMovieDetails(m.imdbID, lang).then(data => {
        if (data) setSlotData(prev => ({ ...prev, [m.imdbID]: data }));
      });
    });
  }, [slotState.slots, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTop100Watched = async (movie: MovieData, idx: number) => {
    if (watchedIds.has(movie.imdbID)) return;
    await addToWatched(movie);
    const newWatchedIds = new Set(watchedIds).add(movie.imdbID);
    setWatchedIds(newWatchedIds);
    setWatchedMovies(l => [...l, movie]);
    setSlotState(prev => {
      const next = prev.pool.find(m => !newWatchedIds.has(m.imdbID));
      if (!next) return prev;
      const newSlots = [...prev.slots];
      newSlots[idx] = next;
      return { slots: newSlots, pool: prev.pool.filter(m => m.imdbID !== next.imdbID) };
    });
  };

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

  const currentLang = LANG_OPTIONS.find(o => o.value === lang)!;

  return (
    <div className="bg-background min-h-screen">

      {/* ── Language switcher (top-right) ─────────────────────────────── */}
      {langOpen && (
        <div className="absolute inset-0 z-[59]" onClick={() => setLangOpen(false)} />
      )}
      <div className="absolute top-4 right-4 z-[60]">
        <button
          onClick={() => setLangOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-secondary/80 transition-colors shadow-sm"
        >
          <currentLang.Flag className="w-4 h-auto rounded-[2px]" />
          <span className="text-xs font-medium">{currentLang.value.toUpperCase()}</span>
          <ChevronDown size={11} className={`text-muted-foreground transition-transform ${langOpen ? 'rotate-180' : ''}`} />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-1.5 bg-background border border-border rounded-xl shadow-lg py-1 min-w-[148px]">
            {LANG_OPTIONS.map(({ value, label, Flag }) => (
              <button
                key={value}
                onClick={() => { setLang(value); setLangOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                  lang === value ? 'text-primary font-semibold' : 'text-foreground'
                }`}
              >
                <Flag className="w-4 h-auto rounded-[2px] flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Enter button ────────────────────────────────────── */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        showFloating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}>
        <button
          onClick={handleEnterApp}
          className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {t('landingEnterApp')} →
        </button>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
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

          <div className="flex flex-col items-center gap-4 mx-auto w-fit">
            <button
              onClick={handleEnterApp}
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg shadow-primary/20"
            >
              {t('landingEnterApp')} →
            </button>
            <button
              onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
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
              {searchResults.length > 0 ? (
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
              ) : !searchQuery ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground/50 mb-2 mt-0.5">{t('landingSuggestLabel')}</p>
                  <div className="space-y-2">
                    {slotState.slots.map((topMovie, i) => {
                      const data = slotData[topMovie.imdbID];
                      if (!data) {
                        return (
                          <div key={topMovie.imdbID} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                            <div className="w-9 h-14 rounded-lg bg-muted flex-shrink-0 animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 bg-muted rounded animate-pulse w-2/3" />
                              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                            </div>
                          </div>
                        );
                      }
                      const poster = data.Poster && data.Poster !== 'N/A' ? data.Poster : null;
                      const checked = watchedIds.has(topMovie.imdbID);
                      return (
                        <button
                          key={topMovie.imdbID}
                          onClick={() => handleTop100Watched(data, i)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                            checked
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-card border border-border hover:border-primary/30'
                          }`}
                        >
                          <div className="w-9 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {poster && <img src={poster} alt={data.Title} className="w-full h-full object-cover" loading="lazy" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{data.Title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{data.Year}</p>
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
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── AI Feature Spotlight ── */}
        <div className="w-full py-20 lg:py-28">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-6">
              <Sparkles size={11} />
              {t('landingAiBadge')}
            </span>
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-5">
              {t('landingAiTitle')}
            </h3>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              {t('landingAiDesc')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto mb-8">
              {[
                { name: 'OpenAI',         dot: 'bg-emerald-500', bg: 'bg-emerald-500/8 border-emerald-500/20' },
                { name: 'Anthropic',      dot: 'bg-orange-500',  bg: 'bg-orange-500/8 border-orange-500/20'  },
                { name: 'Google Gemini',  dot: 'bg-blue-500',    bg: 'bg-blue-500/8 border-blue-500/20'      },
                { name: 'Mistral',        dot: 'bg-rose-500',    bg: 'bg-rose-500/8 border-rose-500/20'      },
                { name: 'Ollama (Local)', dot: 'bg-purple-500',  bg: 'bg-purple-500/8 border-purple-500/20'  },
              ].map(({ name, dot, bg }) => (
                <div key={name} className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border ${bg}`}>
                  <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                  <span className="text-sm font-medium text-foreground">{name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60">{t('landingAiHint')}</p>
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
                    href="https://umami.mokhni.uk/share/fH4J4yX37j8uuyU7"
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
            ref={finalCtaRef}
            onClick={handleEnterApp}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
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
