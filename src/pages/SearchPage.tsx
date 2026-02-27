import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, BookmarkPlus, BookmarkCheck, Film } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { searchMovies } from '@/lib/api';
import {
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  type MovieData,
} from '@/lib/db';

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
      <Link to={`/movie/${movie.imdbID}`} className="flex-shrink-0 w-[80px] aspect-[2/3]">
        {poster ? (
          <img src={poster} alt={movie.Title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Film size={20} className="text-muted-foreground/30" />
          </div>
        )}
      </Link>

      {/* Title + meta */}
      <Link to={`/movie/${movie.imdbID}`} className="flex-1 min-w-0 flex items-center px-3">
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
          className={`p-2.5 h-full rounded-r-xl transition-colors ${
            inWatchlist
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

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError('');
    const data = await searchMovies(q, 1, lang);
    setLoading(false);
    if (data.Response === 'True' && data.Search) {
      setResults(data.Search);
      const wSet = new Set<string>();
      for (const m of data.Search) {
        if (await isInWatchlist(m.imdbID)) wSet.add(m.imdbID);
      }
      setWatchlistIds(wSet);
    } else {
      setResults([]);
      if (data.Error && data.Error !== 'No API key configured') setError(data.Error);
    }
  }, [lang]);

  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [doSearch]);

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

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto space-y-4 animate-fade-in">
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
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground pb-1">{t('searchResults')}</p>
          {results.map((movie) => (
            <SearchResultCard
              key={movie.imdbID}
              movie={movie}
              inWatchlist={watchlistIds.has(movie.imdbID)}
              onToggleWatchlist={() => toggleWatchlist(movie)}
            />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
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
