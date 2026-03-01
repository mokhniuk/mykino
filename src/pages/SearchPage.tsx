import { useState, useEffect, useRef, useCallback } from 'react';
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
      {/* Poster — flush left/top/bottom, 2:3 ratio, no crop */}
      <Link to={movie.Type === 'series' ? `/tv/${movie.imdbID}` : `/movie/${movie.imdbID}`} className="flex-shrink-0 w-[80px] aspect-[2/3]">
        {poster ? (
          <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Film size={20} className="text-muted-foreground/30" />
          </div>
        )}
      </Link>

      {/* Title + meta */}
      <Link to={movie.Type === 'series' ? `/tv/${movie.imdbID}` : `/movie/${movie.imdbID}`} className="flex-1 min-w-0 flex items-center px-3">
        <div className="min-w-0 w-full">
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1.5">{typeLabel}</span>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{movie.Title}</p>
          <p className="text-xs text-muted-foreground mt-1">{movie.Year}</p>
        </div>
      </Link>

      {/* Button */}
      <div className="flex items-center  flex-shrink-0">
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

  // Filter & Pagination state
  const [genres, setGenres] = useState<{ id: number, name: string }[]>([]);
  const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Derive years list (last 100 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  // Fetch metadata
  useEffect(() => {
    Promise.all([
      getGenres(lang),
      getCountries(lang)
    ]).then(([genreData, countryData]) => {
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

  const hasActiveFilters = selectedGenre !== null || selectedYear !== 'all' || selectedCountry !== 'all';

  const fetchData = useCallback(async (q: string, p: number, append = false) => {
    setLoading(true);
    setError('');

    let data;
    const discovery = !q.trim() && hasActiveFilters;
    setIsDiscovery(discovery);

    if (discovery) {
      data = await discoverMovies({
        genre: selectedGenre,
        year: selectedYear,
        country: selectedCountry,
        page: p,
        lang
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
      setResults(prev => append ? [...prev, ...data.Search!] : data.Search!);
      setHasMore(data.Search.length >= 20); // Basic check for more results

      const wSet = new Set(append ? watchlistIds : []);
      for (const m of data.Search) {
        if (await isInWatchlist(m.imdbID)) wSet.add(m.imdbID);
      }
      setWatchlistIds(wSet);
    } else {
      if (!append) setResults([]);
      setHasMore(false);
      if (data.Error && data.Error !== 'No API key configured') setError(data.Error);
    }
  }, [lang, selectedGenre, selectedYear, selectedCountry, watchlistIds, hasActiveFilters]);

  // Handle Search/Filter changes
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      setParams(query ? { q: query } : {}, { replace: true });
      fetchData(query, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, selectedGenre, selectedYear, selectedCountry, fetchData, setParams]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!observerRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(query, nextPage, true);
      }
    }, { threshold: 0.1 });

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, query, fetchData]);

  const toggleWatchlist = async (movie: MovieData) => {
    if (watchlistIds.has(movie.imdbID)) {
      await removeFromWatchlist(movie.imdbID);
      setWatchlistIds((s) => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToWatchlist(movie);
      setWatchlistIds((s) => new Set(s).add(movie.imdbID));
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

        {/* Filters Grid/Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Genre Filter */}
          <Select
            value={selectedGenre?.toString() || "all"}
            onValueChange={(val) => setSelectedGenre(val === "all" ? null : Number(val))}
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

          {/* Year Filter */}
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
          >
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

          {/* Country Filter */}
          <Select
            value={selectedCountry}
            onValueChange={setSelectedCountry}
          >
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

          {/* Clear Filters */}
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

      {/* Infinite Scroll Trigger */}
      <div ref={observerRef} className="h-20 flex items-center justify-center">
        {loading && <Loader2 size={24} className="text-muted-foreground/40 animate-spin" />}
      </div>

      {/* Empty States */}
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

