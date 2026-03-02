import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, BookmarkPlus, BookmarkCheck, Film, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { searchMovies, getGenres, getCountries, discoverMovies } from '@/lib/api';
import {
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  type MovieData,
} from '@/lib/db';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SearchResultCard({
  movie,
  inWatchlist,
  onToggleWatchlist,
}: {
  movie: MovieData;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
}) {
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const typeLabel = movie.Type === 'series' ? 'Series' : movie.Type === 'episode' ? 'Episode' : 'Movie';

  return (
    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary/60 hover:bg-secondary transition-colors">
      <Link to={movie.Type === 'series' ? `/tv/${movie.imdbID}` : `/movie/${movie.imdbID}`} className="flex-shrink-0 w-[80px] aspect-[2/3]">
        {poster ? (
          <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Film size={20} className="text-muted-foreground/30" />
          </div>
        )}
      </Link>

      <Link to={movie.Type === 'series' ? `/tv/${movie.imdbID}` : `/movie/${movie.imdbID}`} className="flex-1 min-w-0 flex items-center px-3">
        <div className="min-w-0 w-full">
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1.5">{typeLabel}</span>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{movie.Title}</p>
          <p className="text-xs text-muted-foreground mt-1">{movie.Year}</p>
        </div>
      </Link>

      <div className="flex items-center flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); onToggleWatchlist(); }}
          className={`p-2.5 h-full rounded-r-xl transition-colors ${inWatchlist
            ? 'text-foreground bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
        >
          {inWatchlist ? <BookmarkCheck size={24} /> : <BookmarkPlus size={24} />}
        </button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState<MovieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

  const [genres, setGenres] = useState<{ id: number, name: string }[]>([]);
  const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  const hasActiveFilters = selectedGenre !== null || selectedYear !== 'all' || selectedCountry !== 'all';

  useEffect(() => {
    Promise.all([getGenres(lang), getCountries(lang)]).then(([genreData, countryData]) => {
      const allGenres = [...genreData.movie, ...genreData.tv];
      const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values())
        .sort((a, b) => a.name.localeCompare(b.name));
      setGenres(uniqueGenres);
      const mappedCountries = countryData.map(c => ({
        code: c.iso_3166_1,
        name: c.native_name || c.english_name
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCountries(mappedCountries);
    });
  }, [lang]);

  // Ref updated every render so the observer callback always has fresh state
  // without the observer needing to be recreated.
  const loadMoreRef = useRef<(() => void) | null>(null);

  // Core fetch — not useCallback, so it never becomes a stale dep itself.
  // Filters are applied client-side when a query is active (TMDB /search/multi
  // doesn't support genre/year/country params, but results include genre_ids,
  // origin_country, and Year which we can filter on).
  const doFetch = async (q: string, p: number, append: boolean) => {
    setLoading(true);
    setError('');

    const isDiscMode = !q.trim() && hasActiveFilters;
    if (!append) setIsDiscovery(isDiscMode);

    let data;
    if (isDiscMode) {
      data = await discoverMovies({
        genre: selectedGenre,
        year: selectedYear,
        country: selectedCountry,
        page: p,
        lang,
      });
    } else if (q.trim()) {
      data = await searchMovies(q, p, lang);
    } else {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.Response === 'True' && data.Search) {
      let items = data.Search;

      // Client-side filter when search query is active
      if (q.trim() && hasActiveFilters) {
        if (selectedGenre !== null) items = items.filter(m => m.genre_ids?.includes(selectedGenre));
        if (selectedYear !== 'all') items = items.filter(m => m.Year === selectedYear);
        if (selectedCountry !== 'all') items = items.filter(m => m.origin_country?.includes(selectedCountry));
      }

      setResults(prev => append ? [...prev, ...items] : items);
      setHasMore(data.Search.length >= 20);

      // Check watchlist status without closing over watchlistIds state
      const newIds = new Set<string>();
      for (const m of data.Search) {
        if (await isInWatchlist(m.imdbID)) newIds.add(m.imdbID);
      }
      setWatchlistIds(prev => {
        const merged = new Set(append ? prev : []);
        for (const id of newIds) merged.add(id);
        return merged;
      });
    } else {
      if (!append) setResults([]);
      setHasMore(false);
      if (data.Error && data.Error !== 'No API key configured') setError(data.Error);
    }
  };

  // Trigger search/discovery when query or filters change.
  // doFetch is intentionally omitted from deps — it's redefined every render
  // with fresh closure values, and all its external deps are listed here directly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      setParams(query ? { q: query } : {}, { replace: true });
      doFetch(query, 1, false);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedGenre, selectedYear, selectedCountry, lang]);

  // Keep loadMoreRef current every render — no dep array needed.
  loadMoreRef.current = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    doFetch(query, nextPage, true);
  };

  // Set up the intersection observer once. It calls loadMoreRef.current which
  // always has the latest state, so the observer never needs to be recreated.
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreRef.current?.(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWatchlist = async (movie: MovieData) => {
    if (watchlistIds.has(movie.imdbID)) {
      await removeFromWatchlist(movie.imdbID);
      setWatchlistIds(s => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToWatchlist(movie);
      setWatchlistIds(s => new Set(s).add(movie.imdbID));
    }
  };

  const clearFilters = () => {
    setSelectedGenre(null);
    setSelectedYear('all');
    setSelectedCountry('all');
  };

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto space-y-4 animate-fade-in pb-10">
      <div className="pt-4 md:pt-8 space-y-4">
        {/* Search Input */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors">
            <SearchIcon size={18} className="text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('typeToSearch')}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            {query && !loading && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-secondary-foreground/10"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            {loading && <Loader2 size={16} className="text-muted-foreground animate-spin" />}
          </div>
        </form>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select
            value={selectedGenre?.toString() || 'all'}
            onValueChange={(val) => setSelectedGenre(val === 'all' ? null : Number(val))}
          >
            <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0">
              <SelectValue placeholder={t('filterGenre')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('anyGenre')}</SelectItem>
              {genres.map(g => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0">
              <SelectValue placeholder={t('filterYear')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allYears')}</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0">
              <SelectValue placeholder={t('filterCountry')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('anyCountry')}</SelectItem>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={`h-9 text-xs transition-opacity ${hasActiveFilters ? 'opacity-100' : 'opacity-0'}`}
          >
            {t('clearFilters')}
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground pb-1">
            {isDiscovery ? t('popularResults') : t('searchResults')}
          </p>
          {results.map((movie) => (
            <SearchResultCard
              key={`${movie.imdbID}-${movie.Type}`}
              movie={movie}
              inWatchlist={watchlistIds.has(movie.imdbID)}
              onToggleWatchlist={() => toggleWatchlist(movie)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-20 flex items-center justify-center">
        {loading && <Loader2 size={24} className="text-muted-foreground/40 animate-spin" />}
      </div>

      {!loading && results.length === 0 && (query || hasActiveFilters) && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <X size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('noResults')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('searchEmptyBody')}</p>
        </div>
      )}

      {!loading && !query && !hasActiveFilters && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <SearchIcon size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('searchEmptyTitle')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('searchEmptyBody')}</p>
        </div>
      )}
    </div>
  );
}
