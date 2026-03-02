import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search, Loader2 } from 'lucide-react';
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
  { value: 'en', label: 'English',     flag: '🇬🇧' },
  { value: 'ua', label: 'Українська',  flag: '🇺🇦' },
  { value: 'de', label: 'Deutsch',     flag: '🇩🇪' },
  { value: 'cs', label: 'Čeština',     flag: '🇨🇿' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [step, setStep] = useState(0);

  // Step 2: genres
  const [selectedGenres, setSelectedGenres] = useState<Set<number>>(new Set());

  // Step 3: watched seeding
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
          setSearchResults(data.Search.slice(0, 8));
        } else {
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const toggleWatched = async (movie: MovieData) => {
    if (watchedIds.has(movie.imdbID)) return; // only add, not remove
    await addToWatched(movie);
    setWatchedIds(s => new Set(s).add(movie.imdbID));
  };

  const handleGenresDone = async () => {
    if (selectedGenres.size > 0) {
      await setSetting('liked_genres', JSON.stringify([...selectedGenres]));
    }
    setStep(3);
  };

  const handleEnterApp = () => {
    localStorage.setItem('hasSeenLanding', 'true');
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress dots (steps 1–3) */}
        {step > 0 && step < 4 && (
          <div className="flex justify-center gap-2 mb-10">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${s <= step ? 'bg-primary' : 'bg-secondary'}`}
              />
            ))}
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <img src="/icon-192.png" alt="My Kino" className="w-20 h-20 rounded-2xl shadow-lg mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-3">{t('landingHeadline')}</h1>
            <p className="text-muted-foreground mb-10 max-w-sm">{t('landingTagline')}</p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              {t('landingGetStarted')}
            </button>
          </div>
        )}

        {/* Step 1: Language */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">{t('landingPickLanguage')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setLang(opt.value); setStep(2); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    lang === opt.value
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-secondary border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  <span className="text-2xl">{opt.flag}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Genres */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">{t('landingPickGenres')}</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">{t('landingPickGenresHint')}</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenres(s => {
                    const n = new Set(s);
                    n.has(g.id) ? n.delete(g.id) : n.add(g.id);
                    return n;
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selectedGenres.has(g.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {g.names[lang]}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:border-primary/40 transition-colors"
              >
                {t('landingSkip')}
              </button>
              <button
                onClick={handleGenresDone}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                {t('landingDone')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Seed Watched */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">{t('landingMarkWatched')}</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">{t('landingMarkWatchedHint')}</p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors mb-4">
              <Search size={18} className="text-muted-foreground flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('searchForMovies')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {searchLoading && <Loader2 size={16} className="text-muted-foreground animate-spin flex-shrink-0" />}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {searchResults.map(movie => {
                const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
                const checked = watchedIds.has(movie.imdbID);
                return (
                  <button
                    key={movie.imdbID}
                    onClick={() => toggleWatched(movie)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${
                      checked ? 'bg-primary/10' : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {poster && (
                        <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{movie.Title}</p>
                      <p className="text-xs text-muted-foreground">{movie.Year}</p>
                    </div>
                    {checked && <Check size={18} className="text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:border-primary/40 transition-colors"
              >
                {t('landingSkip')}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                {t('landingDone')}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completion */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Check size={40} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">{t('landingDoneHeadline')}</h2>
            <p className="text-muted-foreground mb-10 max-w-sm">{t('landingTagline')}</p>
            <button
              onClick={handleEnterApp}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              {t('landingEnterApp')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
