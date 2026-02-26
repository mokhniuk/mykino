import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { searchMovies, type SearchResult } from '@/lib/omdb';
import {
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  addToFavourites, removeFromFavourites, isInFavourites,
  type MovieData,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';

export default function SearchPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState<MovieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError('');
    const data = await searchMovies(q);
    setLoading(false);
    if (data.Response === 'True' && data.Search) {
      setResults(data.Search);
      // Check statuses
      const wSet = new Set<string>();
      const fSet = new Set<string>();
      for (const m of data.Search) {
        if (await isInWatchlist(m.imdbID)) wSet.add(m.imdbID);
        if (await isInFavourites(m.imdbID)) fSet.add(m.imdbID);
      }
      setWatchlistIds(wSet);
      setFavIds(fSet);
    } else {
      setResults([]);
      if (data.Error && data.Error !== 'No API key configured') setError(data.Error);
    }
  }, []);

  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(query ? { q: query } : {});
    doSearch(query);
  };

  const toggleWatchlist = async (movie: MovieData) => {
    if (watchlistIds.has(movie.imdbID)) {
      await removeFromWatchlist(movie.imdbID);
      setWatchlistIds((s) => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToWatchlist(movie);
      setWatchlistIds((s) => new Set(s).add(movie.imdbID));
    }
  };

  const toggleFav = async (movie: MovieData) => {
    if (favIds.has(movie.imdbID)) {
      await removeFromFavourites(movie.imdbID);
      setFavIds((s) => { const n = new Set(s); n.delete(movie.imdbID); return n; });
    } else {
      await addToFavourites(movie);
      setFavIds((s) => new Set(s).add(movie.imdbID));
    }
  };

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <form onSubmit={handleSubmit} className="pt-4 md:pt-8">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors">
          <SearchIcon size={18} className="text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('typeToSearch')}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {loading && <Loader2 size={16} className="text-muted-foreground animate-spin" />}
        </div>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {results.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">{t('searchResults')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {results.map((movie) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                size="md"
                inWatchlist={watchlistIds.has(movie.imdbID)}
                inFavourites={favIds.has(movie.imdbID)}
                onToggleWatchlist={() => toggleWatchlist(movie)}
                onToggleFavourite={() => toggleFav(movie)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="text-center py-20">
          <SearchIcon size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('typeToSearch')}</p>
        </div>
      )}
    </div>
  );
}
