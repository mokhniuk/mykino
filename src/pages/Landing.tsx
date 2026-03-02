import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Lock, Search, Loader2, WifiOff, UserX } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { addToWatched, setSetting, type MovieData } from '@/lib/db';
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

export default function Landing() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const setupRef = useRef<HTMLDivElement>(null);

  const [selectedGenres, setSelectedGenres] = useState<Set<number>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
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
    if (selectedGenres.size > 0) {
      await setSetting('liked_genres', JSON.stringify([...selectedGenres]));
    }
    localStorage.setItem('hasSeenLanding', 'true');
    navigate('/app');
  };

  return (
    <div className="bg-background min-h-screen">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        {/* Subtle radial glow behind icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
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
            {([
              { icon: Lock,   key: 'landingFeaturePrivate'   },
              { icon: WifiOff, key: 'landingFeatureOffline'  },
              { icon: UserX,  key: 'landingFeatureNoAccount' },
            ] as const).map(({ icon: Icon, key }) => (
              <span
                key={key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full border border-border/60"
              >
                <Icon size={11} />
                {t(key)}
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <button
            onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-12 text-muted-foreground/40 hover:text-muted-foreground transition-colors animate-bounce mx-auto block"
            aria-label="Scroll down"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </section>

      {/* ── Setup sections ── */}
      <div ref={setupRef} className="max-w-2xl mx-auto px-6 pb-32">

        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">{t('landingSetupTitle')}</h2>
          <p className="text-muted-foreground">{t('landingSetupSubtitle')}</p>
        </div>

        {/* ── 01 Language ── */}
        <div className="mb-16">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-xs font-bold tabular-nums text-muted-foreground/40 select-none">01</span>
            <h3 className="text-2xl font-semibold text-foreground">{t('landingPickLanguage')}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLang(opt.value)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                  lang === opt.value
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-secondary/50 border-border hover:border-primary/30'
                }`}
              >
                <span className="text-xl leading-none">{opt.flag}</span>
                <span className={`font-medium text-sm ${lang === opt.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 02 Genres ── */}
        <div className="mb-16">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-xs font-bold tabular-nums text-muted-foreground/40 select-none">02</span>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">{t('landingPickGenres')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('landingPickGenresHint')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {GENRES.map(g => {
              const active = selectedGenres.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenres(s => {
                    const n = new Set(s);
                    n.has(g.id) ? n.delete(g.id) : n.add(g.id);
                    return n;
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                  }`}
                >
                  {g.names[lang]}
                </button>
              );
            })}
          </div>
          {selectedGenres.size > 0 && (
            <p className="text-xs text-primary mt-3 font-medium">{selectedGenres.size} selected</p>
          )}
        </div>

        {/* ── 03 Watched ── */}
        <div className="mb-20">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-xs font-bold tabular-nums text-muted-foreground/40 select-none">03</span>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">{t('landingMarkWatched')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('landingMarkWatchedHint')}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border focus-within:border-primary/40 transition-colors">
            <Search size={16} className="text-muted-foreground flex-shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('searchForMovies')}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchLoading && <Loader2 size={15} className="text-muted-foreground animate-spin flex-shrink-0" />}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {searchResults.map(movie => {
                const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
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
                      {poster && (
                        <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
                      )}
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
            <p className="text-xs text-primary mt-3 font-medium">{watchedIds.size} marked as watched</p>
          )}
        </div>

        {/* ── Final CTA ── */}
        <div className="text-center border-t border-border pt-12">
          <h3 className="text-2xl font-bold text-foreground mb-2">{t('landingDoneHeadline')}</h3>
          <p className="text-muted-foreground text-sm mb-7">{t('landingTagline')}</p>
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
