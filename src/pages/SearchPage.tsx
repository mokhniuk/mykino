import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, X, Sparkles, Search, CheckCircle2, BookmarkCheck, History } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { searchMovies, getGenres, getCountries, discoverMovies } from '@/lib/api';
import { type MovieData } from '@/lib/db';
import { getAIRecommendations, isAIEnabled, getAIUsage, AILimitReachedError, type AIRecommendation } from '@/lib/ai';
import MoodChips from '@/components/MoodChips';
import { config } from '@/lib/config';
import { getOrBuildTasteProfile } from '@/lib/tasteProfile';
import { getContentPreferences, getFavourites, getWatchlist, saveSearchHistory } from '@/lib/db';
import { getMovieDetails } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTmdbMetadata } from '@/hooks/useTmdbMetadata';
import { useQueryClient } from '@tanstack/react-query';
import SearchResultCard from '@/components/SearchResultCard';
import { toast } from 'sonner';

interface MovieWithReason extends MovieData {
  aiReason?: string;
  isLoading?: boolean;
}

interface CachedSearchState {
  query: string;
  results: MovieWithReason[];
  aiPage: number;
  aiHasMore: boolean;
  allAiRecommendations: MovieWithReason[];
  useAI: boolean;
  page: number;
  hasMore: boolean;
  timestamp: number;
}

const CACHE_KEY = 'search_results_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export default function SearchPage() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  
  // Try to restore from cache on mount
  const getCachedState = (): CachedSearchState | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const state: CachedSearchState = JSON.parse(cached);
      const age = Date.now() - state.timestamp;
      
      // Cache is valid for 10 minutes
      if (age > CACHE_DURATION) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return state;
    } catch {
      return null;
    }
  };
  
  // Only restore from cache if there's a URL param (navigating back from movie page)
  // Don't restore if URL is empty (user cleared search or fresh page load)
  const urlQuery = params.get('q') || '';
  const cachedState = urlQuery ? getCachedState() : null;
  const shouldRestoreCache = cachedState && cachedState.query === urlQuery;
  
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<MovieWithReason[]>(shouldRestoreCache ? cachedState.results : []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchPending, setSearchPending] = useState(false);
  const [error, setError] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiUsage, setAiUsage] = useState(() => config.hasManagedAI ? getAIUsage() : null);
  const [useAI, setUseAI] = useState(shouldRestoreCache ? cachedState.useAI : false);
  const [aiPage, setAiPage] = useState(shouldRestoreCache ? cachedState.aiPage : 1);
  const [aiHasMore, setAiHasMore] = useState(shouldRestoreCache ? cachedState.aiHasMore : false);
  const [allAiRecommendations, setAllAiRecommendations] = useState<MovieWithReason[]>(shouldRestoreCache ? cachedState.allAiRecommendations : []);

  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const [page, setPage] = useState(shouldRestoreCache ? cachedState.page : 1);
  const [hasMore, setHasMore] = useState(shouldRestoreCache ? cachedState.hasMore : false);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [libraryMatch, setLibraryMatch] = useState<{ title: string; status: 'watched' | 'watchlist' } | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const libraryIdsRef = useRef<Set<string>>(new Set());
  const searchSourceRef = useRef<'chip' | 'input'>('input');
  const { genres: tmdbGenres, countries: tmdbCountries } = useTmdbMetadata();
  const queryClient = useQueryClient();

  // Track if this is initial mount (for cache restoration)
  const isInitialMount = useRef(true);

  // Pre-load library IDs for sorting regular search results
  useEffect(() => {
    (async () => {
      const { getWatched } = await import('@/lib/db');
      const [watchedList, watchlistData] = await Promise.all([getWatched(), getWatchlist()]);
      libraryIdsRef.current = new Set([
        ...watchedList.map(m => m.imdbID),
        ...watchlistData.map(m => m.imdbID),
      ]);
    })();
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  const hasActiveFilters = selectedGenre !== null || selectedYear !== 'all' || selectedCountry !== 'all';

  // Check if AI is enabled and restore toggle state
  useEffect(() => {
    const checkAI = async () => {
      const enabled = await isAIEnabled();
      setAiEnabled(enabled);
      
      if (enabled) {
        // Check if user has a saved preference
        const savedToggle = localStorage.getItem('search_use_ai');
        if (savedToggle !== null) {
          // User has made a choice, respect it
          setUseAI(savedToggle === 'true');
        } else {
          // AI is enabled and user hasn't made a choice, default to ON
          setUseAI(true);
          localStorage.setItem('search_use_ai', 'true');
        }
      } else {
        setUseAI(false);
      }
    };
    
    checkAI();
    
    // Listen for AI config changes from settings
    const handleAIConfigChange = (e: CustomEvent) => {
      const config = e.detail;
      const enabled = config.enabled && !!config.apiKey;
      setAiEnabled(enabled);
      
      if (enabled) {
        // Check if user has a saved preference
        const savedToggle = localStorage.getItem('search_use_ai');
        if (savedToggle !== null) {
          // User has made a choice, respect it
          setUseAI(savedToggle === 'true');
        } else {
          // AI just got enabled, default to ON
          setUseAI(true);
          localStorage.setItem('search_use_ai', 'true');
        }
      } else {
        // AI is disabled, turn off the toggle
        setUseAI(false);
      }
    };
    
    window.addEventListener('ai-config-changed', handleAIConfigChange as EventListener);
    return () => window.removeEventListener('ai-config-changed', handleAIConfigChange as EventListener);
  }, []);

  // Keep AI usage in sync so the toggle can be disabled when limit is reached
  useEffect(() => {
    if (!config.hasManagedAI) return;
    const refresh = () => setAiUsage(getAIUsage());
    window.addEventListener('ai-usage-updated', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    return () => window.removeEventListener('ai-usage-updated', refresh);
  }, []);

  // Save AI toggle state when user manually changes it
  useEffect(() => {
    if (aiEnabled) {
      localStorage.setItem('search_use_ai', String(useAI));
    }
  }, [useAI, aiEnabled]);

  // Ref updated every render so the observer callback always has fresh state
  const loadMoreRef = useRef<(() => void) | null>(null);
  
  // Cache search results when they change (both AI and non-AI)
  useEffect(() => {
    if (results.length > 0 && query) {
      const cacheState: CachedSearchState = {
        query,
        results,
        aiPage,
        aiHasMore,
        allAiRecommendations,
        useAI,
        page,
        hasMore,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheState));
    }
  }, [results, query, aiPage, aiHasMore, allAiRecommendations, useAI, page, hasMore]);

  // AI search function
  const doAISearch = async (q: string, pageNum: number = 1) => {
    if (!q.trim()) {
      setResults([]);
      setAiHasMore(false);
      setAllAiRecommendations([]);
      sessionStorage.removeItem(CACHE_KEY);
      return;
    }

    // Use loadingMore for pagination, loading for initial search.
    // Keep stale results visible while loading — clearing them causes a blank flash
    // and forces every SearchResultCard to remount (re-querying IDB watchlist/watched state).
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const [tasteProfile, contentPreferences, favourites, watchlist, watched] = await Promise.all([
        getOrBuildTasteProfile(),
        getContentPreferences(),
        getFavourites(),
        getWatchlist(),
        queryClient.fetchQuery({ 
          queryKey: ['movies', 'watched'], 
          queryFn: async () => {
            const { getWatched } = await import('@/lib/db');
            return getWatched();
          }
        }),
      ]);

      // Check if query directly matches something in the user's library
      let pivotTitle: string | null = null;
      if (pageNum === 1) {
        const queryLower = q.toLowerCase().trim();
        const matchWatched = watched.find(m => {
          const t = m.Title.toLowerCase();
          return t === queryLower || t.startsWith(queryLower) || queryLower.startsWith(t);
        });
        const matchWatchlist = !matchWatched && watchlist.find(m => {
          const t = m.Title.toLowerCase();
          return t === queryLower || t.startsWith(queryLower) || queryLower.startsWith(t);
        });
        if (matchWatched) {
          setLibraryMatch({ title: matchWatched.Title, status: 'watched' });
          pivotTitle = matchWatched.Title;
        } else if (matchWatchlist) {
          setLibraryMatch({ title: matchWatchlist.Title, status: 'watchlist' });
          pivotTitle = matchWatchlist.Title;
        } else {
          setLibraryMatch(null);
        }
      } else {
        // For pagination, libraryMatch state is already settled from page 1
        pivotTitle = libraryMatch?.title ?? null;
      }

      const langName = lang === 'en' ? 'English' : lang === 'ua' ? 'Ukrainian' : lang === 'de' ? 'German' : lang === 'cs' ? 'Czech' : lang === 'pl' ? 'Polish' : lang === 'pt' ? 'Portuguese' : lang === 'hr' ? 'Croatian' : lang === 'es' ? 'Spanish' : lang === 'it' ? 'Italian' : 'English';

      // If user searched for something they already have, pivot to "similar to X"
      const aiQuery = pivotTitle
        ? `Find movies and TV series similar to "${pivotTitle}". Do not include "${pivotTitle}" itself. Give diverse, high-quality recommendations.`
        : q;

      const fromChip = searchSourceRef.current === 'chip';

      const aiRecommendations = await getAIRecommendations({
        query: aiQuery,
        language: langName,
        count: pageNum === 1 ? 30 : 20,
        tasteProfile,
        contentPreferences,
        favourites: favourites.slice(0, 10).map(m => ({ Title: m.Title, Year: m.Year, Genre: m.Genre })),
        watchlist: watchlist.slice(0, 100).map(m => ({ Title: m.Title, Year: m.Year })),
        // Chip searches: tell AI to exclude watched. Input searches: AI may surface them (sorted first client-side).
        watched: fromChip ? watched.slice(0, 100).map(m => ({ Title: m.Title, Year: m.Year })) : [],
      });

      // DEDUPLICATE AI recommendations by title BEFORE fetching movie data
      const uniqueAiRecs = aiRecommendations.filter((rec, index, self) =>
        index === self.findIndex(r => r.title.toLowerCase() === rec.title.toLowerCase())
      );

      // Fetch movie data in parallel
      const movieDataPromises = uniqueAiRecs.map(async (rec, index) => {
        try {
          const searchResult = await searchMovies(rec.title, 1, lang);
          const movies = searchResult?.Search || [];
          if (movies.length === 0) return { index, movieData: null, reason: rec.reason };
          const movie = movies[0];
          const details = await getMovieDetails(movie.imdbID, lang);
          return { index, movieData: details || movie, reason: rec.reason };
        } catch (e) {
          return { index, movieData: null, reason: rec.reason };
        }
      });

      const movieResults = await Promise.all(movieDataPromises);

      // Filter by disliked countries / languages; for chip searches also exclude watched
      const watchedIds = new Set(watched.map(m => m.imdbID));
      const filteredResults = movieResults.filter(r => {
        if (!r.movieData) return false;
        const movie = r.movieData;

        if (fromChip && watchedIds.has(movie.imdbID)) return false;

        if (movie.Country && contentPreferences.disliked_countries.length > 0) {
          const movieCountries = movie.Country.toLowerCase();
          if (contentPreferences.disliked_countries.some(dc => movieCountries.includes(dc.toLowerCase()))) return false;
        }

        if (movie.Language && contentPreferences.disliked_languages.length > 0) {
          const movieLanguages = movie.Language.split(',').map(l => l.trim().toLowerCase());
          if (movieLanguages.every(ml => contentPreferences.disliked_languages.some(dl => ml.includes(dl.toLowerCase()) || dl.toLowerCase().includes(ml)))) return false;
        }

        return true;
      });

      const newResults: MovieWithReason[] = filteredResults
        .map(r => ({ ...r.movieData!, aiReason: r.reason }));

      // For input AI searches, sort already-watched items to the top
      if (!fromChip && watchedIds.size > 0) {
        newResults.sort((a, b) =>
          (watchedIds.has(b.imdbID) ? 1 : 0) - (watchedIds.has(a.imdbID) ? 1 : 0)
        );
      }
      
      if (pageNum === 1) {
        // Remove duplicates by imdbID
        const uniqueResults = newResults.filter((movie, index, self) =>
          index === self.findIndex(m => m.imdbID === movie.imdbID)
        );
        setResults(uniqueResults);
        setAllAiRecommendations(uniqueResults);
        setAiHasMore(uniqueResults.length >= 10);
        // Save to search history (chip and input AI searches)
        if (uniqueResults.length > 0) {
          saveSearchHistory({
            query: q,
            source: fromChip ? 'chip' : 'input',
            results: uniqueResults,
            timestamp: Date.now(),
          });
        }
      } else {
        // Merge with existing results and remove duplicates
        const combined = [...allAiRecommendations, ...newResults];
        const uniqueResults = combined.filter((movie, index, self) => 
          index === self.findIndex(m => m.imdbID === movie.imdbID)
        );
        setResults(uniqueResults);
        setAllAiRecommendations(uniqueResults);
        setAiHasMore(newResults.length >= 10);
      }
    } catch (error) {
      if (error instanceof AILimitReachedError) {
        toast.error(t('aiLimitReached'));
      } else {
        console.error('AI search error:', error);
        toast.error(t('aiError'));
      }
      setResults([]);
      setAiHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreAI = () => {
    const nextPage = aiPage + 1;
    setAiPage(nextPage);
    doAISearch(query, nextPage);
  };

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

      // Sort library items to the top
      if (libraryIdsRef.current.size > 0) {
        items = [...items].sort((a, b) =>
          (libraryIdsRef.current.has(b.imdbID) ? 1 : 0) - (libraryIdsRef.current.has(a.imdbID) ? 1 : 0)
        );
      }

      setResults(prev => append ? [...prev, ...items] : items);
      setHasMore(data.Search.length >= 20);
      // Save to search history on first page of a real query search
      if (!append && q.trim() && !isDiscMode && items.length > 0) {
        saveSearchHistory({
          query: q,
          source: 'input',
          results: items,
          timestamp: Date.now(),
        });
      }
    } else {
      if (!append) setResults([]);
      setHasMore(false);
      if (data.Error && data.Error !== 'No API key configured') setError(data.Error);
    }
  };

  // Trigger search/discovery when query or filters change.
  useEffect(() => {
    setPage(1);
    setAiPage(1);
    
    // If query is empty, clear cache and results
    if (!query.trim() && !hasActiveFilters) {
      sessionStorage.removeItem(CACHE_KEY);
      setResults([]);
      setLibraryMatch(null);
      setSearchPending(false);
      setParams({}, { replace: true });
      isInitialMount.current = false;
      return;
    }
    
    // Check if we have cached results (only on initial mount when navigating back)
    if (isInitialMount.current && shouldRestoreCache && results.length > 0) {
      // We already have cached results from navigation back, don't search again
      isInitialMount.current = false;
      return;
    }
    
    isInitialMount.current = false;
    
    const hasQuery = query.trim().length > 0;
    const queryLongEnough = query.trim().length >= 2;

    // Delay the pending indicator so it doesn't flash on every keystroke
    const pendingTimer = hasQuery ? setTimeout(() => setSearchPending(true), 150) : null;

    const delay = useAI ? 300 : 500;
    const timer = setTimeout(() => {
      if (pendingTimer) clearTimeout(pendingTimer);
      setSearchPending(false);
      setParams(query ? { q: query } : {}, { replace: true });

      if (useAI && hasQuery) {
        doAISearch(query, 1);
      } else if (queryLongEnough || hasActiveFilters) {
        doFetch(query, 1, false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      if (pendingTimer) clearTimeout(pendingTimer);
      setSearchPending(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedGenre, selectedYear, selectedCountry, lang, useAI]);

  // Handle mood chip clicks
  const handleMoodClick = (mood: string) => {
    searchSourceRef.current = 'chip';
    setQuery(mood);
  };

  // Keep loadMoreRef current every render — no dep array needed.
  loadMoreRef.current = () => {
    if (!hasMore || loading || useAI) return; // Disable infinite scroll for AI results
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
          <div className="flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              loading
                ? 'glass-spin'
                : 'bg-secondary border border-border focus-within:border-primary/40 glass-shine'
            }`}>
              {useAI ? (
                <Sparkles size={18} className="text-primary" />
              ) : (
                <SearchIcon size={18} className="text-muted-foreground" />
              )}
              <input
                type="search"
                value={query}
                onChange={(e) => { searchSourceRef.current = 'input'; setQuery(e.target.value); }}
                placeholder={useAI ? t('aiSearchPlaceholder') : t('typeToSearch')}
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
            
            {aiEnabled && (() => {
              const limitReached = aiUsage?.remaining === 0;
              return (
                <button
                  type="button"
                  onClick={() => !limitReached && setUseAI(!useAI)}
                  disabled={limitReached}
                  title={limitReached ? t('aiLimitReached') : undefined}
                  aria-label={t('aiAdvisor')}
                  className={`flex items-center gap-2 px-3 py-3.5 rounded-xl border transition-colors shrink-0 glass-shine ${
                    limitReached
                      ? 'bg-secondary border-border opacity-40 cursor-not-allowed'
                      : useAI
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles size={14} className={useAI ? 'text-primary' : ''} />
                  <span className="text-xs font-semibold tracking-wide">AI</span>
                  {/* Mini switch track */}
                  <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${useAI && !limitReached ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all duration-200 ${useAI && !limitReached ? 'left-3.5 bg-primary-foreground' : 'left-0.5 bg-muted-foreground/60'}`} />
                  </div>
                </button>
              );
            })()}

            <Link
              to="/app/history"
              aria-label={t('searchHistory')}
              className="flex items-center justify-center p-3.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0 glass-shine"
            >
              <History size={16} />
            </Link>
          </div>
        </form>

        {/* Filters */}
        {!useAI && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedGenre?.toString() || 'all'}
              onValueChange={(val) => setSelectedGenre(val === 'all' ? null : Number(val))}
            >
              <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0 flex-1">
                <SelectValue placeholder={t('filterGenre')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('anyGenre')}</SelectItem>
                {tmdbGenres.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0 flex-1">
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
              <SelectTrigger className="h-9 glass border-none bg-secondary/50 text-xs text-muted-foreground focus:ring-0 flex-1">
                <SelectValue placeholder={t('filterCountry')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('anyCountry')}</SelectItem>
                {tmdbCountries.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
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
        )}

        {/* Mood Chips for AI */}
        {useAI && !query && (
          <MoodChips onSelect={handleMoodClick} />
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {libraryMatch && useAI && results.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            libraryMatch.status === 'watched' ? 'bg-green-500/10' : 'bg-primary/10'
          }`}>
            {libraryMatch.status === 'watched'
              ? <CheckCircle2 size={14} className="text-green-500" />
              : <BookmarkCheck size={14} className="text-primary" />
            }
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{libraryMatch.title}</span>
            {' '}{libraryMatch.status === 'watched' ? t('alreadyWatchedBanner') : t('alreadyWatchlistBanner')}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground pb-1">
            {useAI ? `${t('searchResults')} "${query}"` : isDiscovery ? t('popularResults') : t('searchResults')}
          </p>
          {results.map((movie, index) => (
            movie.isLoading ? (
              <div key={`loading-${index}`} className="flex items-stretch rounded-xl overflow-hidden bg-secondary/60 animate-pulse">
                <div className="flex-shrink-0 w-[80px] aspect-[2/3] bg-muted" />
                <div className="flex-1 min-w-0 flex items-center px-3">
                  <div className="min-w-0 w-full space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ) : (
              <SearchResultCard
                key={`${movie.imdbID}-${movie.Type}`}
                movie={movie}
                aiReason={movie.aiReason}
                onWatchlistChange={() => queryClient.invalidateQueries({ queryKey: ['movies', 'watchlist'] })}
                onWatchedChange={() => queryClient.invalidateQueries({ queryKey: ['movies', 'watched'] })}
              />
            )
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!useAI && (
        <div ref={observerRef} className="h-20 flex items-center justify-center">
          {loading && <Loader2 size={24} className="text-muted-foreground/40 animate-spin" />}
        </div>
      )}

      {/* Load More button for AI */}
      {useAI && aiHasMore && results.length > 0 && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMoreAI}
            disabled={loadingMore}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              loadingMore
                ? 'glass-spin text-muted-foreground cursor-not-allowed'
                : 'bg-secondary border border-border glass-shine text-foreground hover:bg-secondary/70'
            }`}
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('aiSearching')}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {t('loadMore')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading state for AI search — only when no prior results to keep visible */}
      {(loading || searchPending) && useAI && query && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('aiSearching')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('aiSearchingDesc')}</p>
        </div>
      ) : !loading && !loadingMore && !searchPending && results.length === 0 && (query || hasActiveFilters) ? (
        /* Nothing found - ONLY show when NOT loading AND NOT pending AND no results */
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <X size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('noResults')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('searchEmptyBody')}</p>
        </div>
      ) : !loading && !searchPending && !query && !hasActiveFilters && results.length === 0 ? (
        /* Empty state - ONLY show when NOT loading and no query */
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <SearchIcon size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('searchEmptyTitle')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('searchEmptyBody')}</p>
        </div>
      ) : null}
    </div>
  );
}
