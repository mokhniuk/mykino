import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Trash2, Sparkles, Search, ChevronLeft, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import {
  getSearchHistory,
  getSearchHistoryCount,
  deleteSearchHistoryEntry,
  clearSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/db';
import MovieCard from '@/components/MovieCard';
import HorizontalScroll from '@/components/HorizontalScroll';

const PAGE_SIZE = 10;

function formatDateGroup(timestamp: number, t: (key: string) => string, lang: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('searchHistoryToday');
  if (date.toDateString() === yesterday.toDateString()) return t('searchHistoryYesterday');

  return date.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(timestamp: number, lang: string): string {
  return new Date(timestamp).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(
  entries: SearchHistoryEntry[],
  t: (key: string) => string,
  lang: string
): { label: string; entries: SearchHistoryEntry[] }[] {
  const map = new Map<string, SearchHistoryEntry[]>();
  for (const entry of entries) {
    const label = formatDateGroup(entry.timestamp, t, lang);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }
  return Array.from(map.entries()).map(([label, entries]) => ({ label, entries }));
}

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [allEntries, setAllEntries] = useState<SearchHistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: total = 0 } = useQuery({
    queryKey: ['search_history', 'count'],
    queryFn: getSearchHistoryCount,
  });

  const { isLoading } = useQuery({
    queryKey: ['search_history', 'page', offset],
    queryFn: async () => {
      const entries = await getSearchHistory(PAGE_SIZE, offset);
      if (offset === 0) {
        setAllEntries(entries);
      } else {
        setAllEntries(prev => [...prev, ...entries]);
      }
      return entries;
    },
    staleTime: 0,
  });

  const hasMore = allEntries.length < total;

  const handleLoadMore = () => {
    setOffset(prev => prev + PAGE_SIZE);
  };

  const handleDelete = useCallback(async (id: number) => {
    await deleteSearchHistoryEntry(id);
    setAllEntries(prev => prev.filter(e => e.id !== id));
    queryClient.invalidateQueries({ queryKey: ['search_history', 'count'] });
  }, [queryClient]);

  const handleClearAll = async () => {
    await clearSearchHistory();
    setAllEntries([]);
    setOffset(0);
    setConfirmClear(false);
    queryClient.invalidateQueries({ queryKey: ['search_history'] });
  };

  const groups = groupByDate(allEntries, t, lang);

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between pt-4 md:pt-8 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl md:text-3xl text-foreground">{t('searchHistory')}</h1>
            {!isLoading && total > 0 && (
              <span className="text-lg font-medium text-muted-foreground">{total}</span>
            )}
          </div>
        </div>

        {allEntries.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
            {t('searchHistoryClearAll')}
          </button>
        )}
      </div>

      {/* Confirm clear dialog */}
      {confirmClear && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-foreground">{t('searchHistoryClearConfirm')}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
            >
              {t('confirmClear')}
            </button>
          </div>
        </div>
      )}

      {isLoading && allEntries.length === 0 ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
              <div className="flex gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="w-28 flex-shrink-0">
                    <div className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : allEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <History size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">{t('searchHistoryEmpty')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">{t('searchHistoryEmptyHint')}</p>
          <Link
            to="/app/search"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('search')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {group.label}
              </p>
              <div className="space-y-5">
                {group.entries.map(entry => (
                  <div key={entry.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.source === 'chip' ? (
                          <Sparkles size={13} className="text-primary shrink-0" />
                        ) : (
                          <Search size={13} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{entry.query}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          · {formatTime(entry.timestamp, lang)} · {entry.results.length} {t('searchHistoryResults')}
                        </span>
                      </div>
                      <button
                        onClick={() => entry.id != null && handleDelete(entry.id)}
                        className="p-1 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <HorizontalScroll>
                      {entry.results.map(movie => (
                        <div key={movie.imdbID} className="w-28 flex-shrink-0">
                          <MovieCard movie={movie} size="sm" />
                        </div>
                      ))}
                    </HorizontalScroll>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors glass-shine"
              >
                {t('searchHistoryLoadMore')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
