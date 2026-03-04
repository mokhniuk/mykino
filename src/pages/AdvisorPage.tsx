import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, BookmarkPlus, CheckCircle2, ChevronRight, RotateCcw, Lock, AlertTriangle, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { callAdvisor, AdvisorGateError } from '@/lib/advisor';
import type { AdvisorRecommendation, AdvisorResponse } from '@/lib/advisor';
import { addToWatchlist, addToWatched, getWatched, getWatchlist } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { getRemainingCalls, DAILY_LIMIT } from '@/lib/advisorCache';

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type State =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'results'; data: AdvisorResponse; query: string }
    | { kind: 'gate' }
    | { kind: 'limit' }
    | { kind: 'fallback'; query: string }
    | { kind: 'error'; message: string };

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence, t }: { confidence: number; t: (k: string) => string }) {
    if (confidence >= 0.75) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                <Star size={9} fill="currentColor" /> {t('advisorConfidenceHigh')}
            </span>
        );
    }
    if (confidence >= 0.45) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                <Star size={9} /> {t('advisorConfidenceMed')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
            {t('advisorConfidenceLow')}
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="flex gap-3 p-4 rounded-2xl bg-card border border-border/50 animate-pulse">
            <div className="w-16 h-24 rounded-lg bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 pt-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-full mt-3" />
                <div className="h-3 bg-muted rounded w-5/6" />
            </div>
        </div>
    );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({
    rec,
    t,
    onAddWatchlist,
    onMarkWatched,
    isWatched,
    isWatchlist,
}: {
    rec: AdvisorRecommendation;
    t: (k: string) => string;
    onAddWatchlist: (rec: AdvisorRecommendation) => void;
    onMarkWatched: (rec: AdvisorRecommendation) => void;
    isWatched: boolean;
    isWatchlist: boolean;
}) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="group flex gap-3 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-black/10">
            {/* Poster */}
            <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-muted">
                {rec.poster ? (
                    <img
                        src={rec.poster}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Sparkles size={20} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight text-foreground truncate">{rec.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{rec.year}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">
                                {rec.type}
                            </span>
                            <ConfidenceBadge confidence={rec.confidence} t={t} />
                        </div>
                    </div>
                </div>

                {/* AI reasoning — collapsible */}
                <div className="mt-2">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span className="font-medium">{t('advisorWhyThis')}</span>
                        <ChevronRight
                            size={12}
                            className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                        />
                    </button>
                    {expanded && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                            {rec.reason}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                    {isWatched ? (
                        <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            {t('advisorStatusWatched')}
                        </span>
                    ) : isWatchlist ? (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
                                <BookmarkPlus size={12} />
                                {t('advisorStatusWatchlist')}
                            </span>
                            <button
                                onClick={() => onMarkWatched(rec)}
                                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-emerald-600 hover:text-white transition-all duration-150 font-medium"
                            >
                                <CheckCircle2 size={12} />
                                {t('markAsWatched')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => onAddWatchlist(rec)}
                                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-all duration-150 font-medium"
                            >
                                <BookmarkPlus size={12} />
                                {t('addToWatchlist')}
                            </button>
                            <button
                                onClick={() => onMarkWatched(rec)}
                                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-emerald-600 hover:text-white transition-all duration-150 font-medium"
                            >
                                <CheckCircle2 size={12} />
                                {t('markAsWatched')}
                            </button>
                        </>
                    )}
                    {rec.tmdbId && (
                        <button
                            onClick={() => navigate(`/app/movie/${rec.tmdbId}`)}
                            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t('advisorViewDetails')}
                            <ChevronRight size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Mood chips ───────────────────────────────────────────────────────────────
const MOOD_KEYS = [
    'advisorMoodThoughtful',
    'advisorMoodLight',
    'advisorMoodDark',
    'advisorMoodArthouse',
    'advisorMoodMindBending',
    'advisorMoodSurprise',
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdvisorPage() {
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const [input, setInput] = useState('');
    const [state, setState] = useState<State>({ kind: 'idle' });
    const [remaining, setRemaining] = useState(DAILY_LIMIT);
    const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
    const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState(5);

    const debouncedInput = useDebounce(input, 500);
    const prevDebouncedRef = useRef('');
    const isRunning = useRef(false);

    const refreshStatuses = useCallback(async () => {
        const [watched, watchlist] = await Promise.all([getWatched(), getWatchlist()]);
        setWatchedIds(new Set(watched.map(m => m.imdbID)));
        setWatchlistIds(new Set(watchlist.map(m => m.imdbID)));
    }, []);

    // Load data on mount
    useEffect(() => {
        getRemainingCalls().then(setRemaining);
        refreshStatuses();
    }, [refreshStatuses]);

    // Remove auto-submit when debounced input changes (non-empty, changed)
    // - Handled manually by Enter key or Mood click for better UX and rate limiting

    const handleSubmit = useCallback(async (query: string, bypassCache = false) => {
        const q = query.trim();
        if (!q || isRunning.current) return;
        isRunning.current = true;
        setState({ kind: 'loading' });

        try {
            const data = await callAdvisor(q, lang, 0, bypassCache);
            const rem = await getRemainingCalls();
            setRemaining(rem);
            if (data.recommendations.length === 0) {
                setState({ kind: 'fallback', query: q });
            } else {
                setState({ kind: 'results', data, query: q });
                setVisibleCount(5); // Reset pagination on new search
            }
        } catch (err) {
            if (err instanceof AdvisorGateError) {
                if (err.code === 'not_enough_watched') setState({ kind: 'gate' });
                else setState({ kind: 'limit' });
            } else {
                setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
            }
        } finally {
            isRunning.current = false;
        }
    }, []);

    const handleMoodClick = (key: string) => {
        const label = t(key as Parameters<typeof t>[0]);
        setInput(label);
        prevDebouncedRef.current = ''; // force re-trigger
        handleSubmit(label, true);
    };

    const handleAddWatchlist = async (rec: AdvisorRecommendation) => {
        if (!rec.tmdbData) return;
        await addToWatchlist(rec.tmdbData);
        await refreshStatuses();
        toast({ title: t('addToWatchlist'), description: rec.title });
    };

    const handleMarkWatched = async (rec: AdvisorRecommendation) => {
        if (!rec.tmdbData) return;
        await addToWatched(rec.tmdbData);
        await refreshStatuses();
        toast({ title: t('markAsWatched'), description: rec.title });
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 mb-4">
                    <Sparkles size={26} className="text-violet-400" strokeWidth={1.8} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('advisor')}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t('advisorSubtitle')}</p>
                {remaining < DAILY_LIMIT && (
                    <p className="text-xs text-muted-foreground mt-2 opacity-60">
                        {remaining} {t('advisorRemainingCalls')}
                    </p>
                )}
            </div>

            {/* Gated state — show inline but don't let them search */}
            {state.kind !== 'gate' && (
                <>
                    {/* Input */}
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value.slice(0, 500))}
                            placeholder={t('advisorInputPlaceholder')}
                            className="w-full pl-9 pr-4 py-3 rounded-2xl bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    prevDebouncedRef.current = '';
                                    handleSubmit(input, true);
                                }
                            }}
                        />
                    </div>

                    {/* Mood chips */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {MOOD_KEYS.map(key => (
                            <button
                                key={key}
                                onClick={() => handleMoodClick(key)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:bg-violet-600 hover:text-white border border-border/40 hover:border-violet-500 transition-all duration-150"
                            >
                                {t(key as Parameters<typeof t>[0])}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* ── State rendering ─────────────────────────────────────────────────── */}

            {state.kind === 'idle' && (
                <div className="text-center py-16 text-muted-foreground">
                    <Sparkles size={40} className="mx-auto mb-4 opacity-20" strokeWidth={1.2} />
                    <p className="font-medium">{t('advisorEmptyState')}</p>
                    <p className="text-sm mt-1 opacity-70">{t('advisorEmptyStateBody')}</p>
                </div>
            )}

            {state.kind === 'loading' && (
                <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground mb-4 animate-pulse">{t('advisorLoading')}</p>
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            )}

            {state.kind === 'gate' && (
                <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                        <Lock size={28} className="text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{t('advisorGateTitle')}</h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t('advisorGateBody')}</p>
                </div>
            )}

            {state.kind === 'limit' && (
                <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4">
                        <AlertTriangle size={28} className="text-amber-400" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{t('advisorLimitTitle')}</h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t('advisorLimitBody')}</p>
                </div>
            )}

            {state.kind === 'fallback' && (
                <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                        <RotateCcw size={28} className="text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{t('advisorFallbackTitle')}</h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t('advisorFallbackBody')}</p>
                    <button
                        onClick={() => handleSubmit(state.query)}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <RotateCcw size={14} />
                        {t('advisorTryAgain')}
                    </button>
                </div>
            )}

            {state.kind === 'error' && (
                <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-4">
                        <AlertTriangle size={28} className="text-red-400" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-base font-semibold text-foreground">{state.message}</h2>
                    <button
                        onClick={() => {
                            prevDebouncedRef.current = '';
                            handleSubmit(input);
                        }}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <RotateCcw size={14} />
                        {t('advisorTryAgain')}
                    </button>
                </div>
            )}

            {state.kind === 'results' && (
                <div>
                    {/* AI summary */}
                    {state.data.summary && (
                        <div className="mb-5 px-4 py-3 rounded-xl bg-violet-500/8 border border-violet-500/15 text-sm flex items-start gap-3">
                            <span className="text-violet-400 mt-0.5 animate-pulse">✦</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-4 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">{t('advisorSummary')}</span>
                                    <button
                                        onClick={() => handleSubmit(state.query, true)}
                                        className="text-[10px] text-muted-foreground hover:text-violet-400 flex items-center gap-1 transition-colors"
                                    >
                                        <RotateCcw size={10} />
                                        {t('advisorRefresh')}
                                    </button>
                                </div>
                                <p className="text-muted-foreground leading-relaxed italic">
                                    {state.data.summary}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="space-y-3">
                        {state.data.recommendations.slice(0, visibleCount).map((rec, i) => (
                            <RecommendationCard
                                key={`${rec.title}-${i}`}
                                rec={rec}
                                t={t}
                                onAddWatchlist={handleAddWatchlist}
                                onMarkWatched={handleMarkWatched}
                                isWatched={rec.tmdbData ? watchedIds.has(rec.tmdbData.imdbID) : false}
                                isWatchlist={rec.tmdbData ? watchlistIds.has(rec.tmdbData.imdbID) : false}
                            />
                        ))}
                    </div>

                    {/* Show more button */}
                    {visibleCount < state.data.recommendations.length && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 5)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary hover:bg-violet-600 hover:text-white text-sm font-medium transition-all duration-150 border border-border/40 hover:border-violet-500"
                            >
                                <ChevronRight size={16} className="rotate-90" />
                                {t('advisorShowMore') || 'Show 5 more'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
