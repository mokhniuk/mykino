import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Globe, Palette, Info, Sun, Moon, Monitor, Database, Download, Upload, RefreshCw, Loader2, Smartphone, SlidersHorizontal, X, Trash2, Sparkles, Zap, Cloud, CloudOff, CheckCircle2, CreditCard } from 'lucide-react';
import { config } from '@/lib/config';
import { getAIUsage } from '@/lib/ai';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmail, signOut } from '@/lib/supabase';
import { getLastSyncTime } from '@/lib/sync';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n, formatDate, type Lang } from '@/lib/i18n';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { exportAllData, importAllData, getContentPreferences, setContentPreferences, type ContentPreferences, getDBStats, type DBStats, clearAllData } from '@/lib/db';
import { clearRecommendationsCache } from '@/lib/recommendations';
import { triggerSWUpdate } from '@/lib/sw-update';
import { useTmdbMetadata } from '@/hooks/useTmdbMetadata';
import { getAIConfig, setAIConfig, type AIConfig, type AIProvider } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CategoryPickerProps {
  label: string;
  items: { id: string; label: string }[];
  liked: string[];
  disliked: string[];
  onAddLiked: (id: string) => void;
  onAddDisliked: (id: string) => void;
  onRemove: (id: string) => void;
  includeLabel: string;
  excludeLabel: string;
}

function CategoryPicker({ label, items, liked, disliked, onAddLiked, onAddDisliked, onRemove, includeLabel, excludeLabel }: CategoryPickerProps) {
  const metadataLoading = items.length === 0;
  const selectedIds = new Set([...liked, ...disliked]);
  const available = items.filter(i => !selectedIds.has(i.id));
  const getLabel = (id: string) => items.find(i => i.id === id)?.label ?? id;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Select value="" onValueChange={onAddLiked} disabled={metadataLoading || available.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={`+ ${includeLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {available.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {liked.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {metadataLoading
                ? liked.map(id => <span key={id} className="h-5 w-14 rounded-full bg-muted animate-pulse inline-block" />)
                : liked.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30">
                      {getLabel(id)}
                      <button onClick={() => onRemove(id)} className="hover:opacity-70 transition-opacity ml-0.5" aria-label="Remove">
                        <X size={10} />
                      </button>
                    </span>
                  ))
              }
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Select value="" onValueChange={onAddDisliked} disabled={metadataLoading || available.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={`✕ ${excludeLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {available.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {disliked.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {metadataLoading
                ? disliked.map(id => <span key={id} className="h-5 w-14 rounded-full bg-muted animate-pulse inline-block" />)
                : disliked.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                      {getLabel(id)}
                      <button onClick={() => onRemove(id)} className="hover:opacity-70 transition-opacity ml-0.5" aria-label="Remove">
                        <X size={10} />
                      </button>
                    </span>
                  ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [prefs, setPrefs] = useState<ContentPreferences | null>(null);
  const [stats, setStats] = useState<DBStats | null>(null);
  const [aiConfig, setAiConfigState] = useState<AIConfig | null>(null);
  const [tempAiConfig, setTempAiConfig] = useState<AIConfig | null>(null);
  const [savingAI, setSavingAI] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ used: number; remaining: number; limit: number } | null>(null);
  const { user, accessToken, syncing, triggerSync } = useAuth();
  const { isPro, cancelAt, refetch: refetchProfile } = useProfile();
  const [syncEmail, setSyncEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const [activatingPlan, setActivatingPlan] = useState(false);

  useEffect(() => {
    if (config.hasSync) setLastSynced(getLastSyncTime());
  }, [syncing]);
  const queryClient = useQueryClient();
  const { genres, countries, languages } = useTmdbMetadata();
  const [pendingImport, setPendingImport] = useState<any>(null);

  useEffect(() => {
    getContentPreferences().then(setPrefs);
    getDBStats().then(setStats);
    getAIConfig().then(cfg => {
      setAiConfigState(cfg);
      setTempAiConfig(cfg);
    });
    if (config.hasManagedAI) setAiUsage(getAIUsage());
  }, []);

  const updatePrefs = async (newPrefs: ContentPreferences) => {
    setPrefs(newPrefs);
    await setContentPreferences(newPrefs);
    await clearRecommendationsCache();
    queryClient.removeQueries({ queryKey: ['movies', 'recommendations'] });
  };

  const saveAIConfig = async () => {
    if (!tempAiConfig) return;
    setSavingAI(true);
    try {
      await setAIConfig(tempAiConfig);
      setAiConfigState(tempAiConfig);
      toast.success(t('aiConfigSaved'));
      // Notify other components that AI config changed
      window.dispatchEvent(new CustomEvent('ai-config-changed', { detail: tempAiConfig }));
    } catch (error) {
      toast.error(t('aiError'));
    } finally {
      setSavingAI(false);
    }
  };

  const handleAIToggle = async (enabled: boolean) => {
    const newConfig = { ...tempAiConfig!, enabled };
    setTempAiConfig(newConfig);
    
    // If disabling, save immediately
    if (!enabled) {
      setSavingAI(true);
      try {
        await setAIConfig(newConfig);
        setAiConfigState(newConfig);
        toast.success(t('aiConfigSaved'));
        // Notify other components that AI config changed
        window.dispatchEvent(new CustomEvent('ai-config-changed', { detail: newConfig }));
      } catch (error) {
        toast.error(t('aiError'));
      } finally {
        setSavingAI(false);
      }
    }
    // If enabling and API key already exists, save immediately
    else if (enabled && newConfig.apiKey) {
      setSavingAI(true);
      try {
        await setAIConfig(newConfig);
        setAiConfigState(newConfig);
        toast.success(t('aiConfigSaved'));
        // Notify other components that AI config changed
        window.dispatchEvent(new CustomEvent('ai-config-changed', { detail: newConfig }));
      } catch (error) {
        toast.error(t('aiError'));
      } finally {
        setSavingAI(false);
      }
    }
  };

  // Parse URL params once on mount — store intent in state, clear URL immediately
  const [stripeReturn, setStripeReturn] = useState<'checkout-success' | 'checkout-cancelled' | 'portal' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const portal = params.get('portal');
    if (checkout === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      setStripeReturn('checkout-success');
    } else if (checkout === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
      setStripeReturn('checkout-cancelled');
    } else if (portal === 'returned') {
      window.history.replaceState({}, '', window.location.pathname);
      setStripeReturn('portal');
    }
  }, []);

  // Act on stripe return once accessToken is available
  useEffect(() => {
    if (!stripeReturn || !accessToken) return;

    if (stripeReturn === 'checkout-cancelled') {
      toast.info(t('checkoutCancelled'));
      setStripeReturn(null);
      return;
    }

    if (stripeReturn === 'checkout-success') {
      setStripeReturn(null);
      setActivatingPlan(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const result = await refetchProfile();
        if (result.data?.plan === 'pro') {
          clearInterval(poll);
          setActivatingPlan(false);
          toast.success(t('checkoutSuccess'));
        } else if (attempts >= 15) {
          clearInterval(poll);
          setActivatingPlan(false);
          toast.error('Plan not activated yet — check your Stripe webhook configuration.');
        }
      }, 2000);
      return;
    }

    if (stripeReturn === 'portal') {
      setStripeReturn(null);
      fetch(`${import.meta.env.VITE_AI_PROXY_URL || ''}/api/stripe/refresh-plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }).finally(() => refetchProfile());
    }
  }, [stripeReturn, accessToken]);

  const handleUpgrade = async (annual: boolean) => {
    if (!accessToken) { toast.error('Please sign in first.'); return; }

    try {
      const res = await fetch(`${import.meta.env.VITE_AI_PROXY_URL || ''}/api/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ annual }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to start checkout. Please try again.'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const handleManagePlan = async () => {
    if (!accessToken) { toast.error('Please sign in first.'); return; }

    try {
      const res = await fetch(`${import.meta.env.VITE_AI_PROXY_URL || ''}/api/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to open billing portal.'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal.');
    }
  };

  const handleSendLink = async () => {
    const email = syncEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSendingLink(true);
    try {
      await signInWithEmail(email);
      setLinkSent(true);
    } catch {
      toast.error('Failed to send sign-in link. Check your email address.');
    } finally {
      setSendingLink(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const formatLastSynced = (ts: number | null): string => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t('syncJustNow');
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const checkVersion = async () => {
    try {
      setCheckingUpdate(true);
      const res = await fetch(`/version.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version !== __APP_VERSION__) {
          setNewVersion(data.version);
        }
      }
    } catch (e) {
      console.error('Failed to check version', e);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    checkVersion();
  }, []);

  const handleUpdate = () => {
    triggerSWUpdate();
  };

  const isStandalone = useMemo(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
    , []);

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const filename = `mykino-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    // On mobile, prefer the native share sheet (lets user save to Files, AirDrop, etc.)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'MyKino backup' });
        return;
      } catch {
        // User cancelled — fall through to download
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.watchlist && !data.watched && !data.favourites && !data.settings) throw new Error();
      setPendingImport(data);
    } catch {
      toast.error(t('importError'));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await importAllData(pendingImport);
      toast.success(t('importSuccess'));
      // Reload ensures all contexts (theme, i18n, query cache) are updated
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error(t('importError'));
    } finally {
      setImporting(false);
      setPendingImport(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    await clearAllData();
    toast.success(t('dataCleared'));
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  const themeOptions: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('lightMode'), icon: <Sun size={15} /> },
    { value: 'system', label: t('systemMode'), icon: <Monitor size={15} /> },
    { value: 'dark', label: t('darkMode'), icon: <Moon size={15} /> },
  ];

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto animate-fade-in py-4 md:py-8 space-y-4">
      <h1 className="text-2xl md:text-3xl text-foreground mb-6">{t('settings')}</h1>

      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        {/* Language */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Globe size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('languageSetting')}</h2>
          </div>
          <Select value={lang} onValueChange={v => setLang(v as Lang)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ua">Українська</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="cs">Čeština</SelectItem>
              <SelectItem value="pl">Polski</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="hr">Hrvatski</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Theme */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Palette size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('themeSetting')}</h2>
          </div>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Content Settings — full width */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 text-foreground">
            <SlidersHorizontal size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('contentSettings')}</h2>
          </div>
          {prefs ? (
            <>
              <CategoryPicker
                label={t('genres')}
                items={genres.map(g => ({ ...g, id: String(g.id) }))}
                liked={prefs.liked_genres.map(String)}
                disliked={prefs.disliked_genres.map(String)}
                onAddLiked={id => updatePrefs({
                  ...prefs,
                  liked_genres: [...prefs.liked_genres.filter(g => g !== Number(id)), Number(id)],
                  disliked_genres: prefs.disliked_genres.filter(g => g !== Number(id)),
                })}
                onAddDisliked={id => updatePrefs({
                  ...prefs,
                  disliked_genres: [...prefs.disliked_genres.filter(g => g !== Number(id)), Number(id)],
                  liked_genres: prefs.liked_genres.filter(g => g !== Number(id)),
                })}
                onRemove={id => updatePrefs({
                  ...prefs,
                  liked_genres: prefs.liked_genres.filter(g => g !== Number(id)),
                  disliked_genres: prefs.disliked_genres.filter(g => g !== Number(id)),
                })}
                includeLabel={t('include')}
                excludeLabel={t('exclude')}
              />
              <CategoryPicker
                label={t('countries')}
                items={countries}
                liked={prefs.liked_countries}
                disliked={prefs.disliked_countries}
                onAddLiked={id => updatePrefs({
                  ...prefs,
                  liked_countries: [...prefs.liked_countries.filter(c => c !== id), id],
                  disliked_countries: prefs.disliked_countries.filter(c => c !== id),
                })}
                onAddDisliked={id => updatePrefs({
                  ...prefs,
                  disliked_countries: [...prefs.disliked_countries.filter(c => c !== id), id],
                  liked_countries: prefs.liked_countries.filter(c => c !== id),
                })}
                onRemove={id => updatePrefs({
                  ...prefs,
                  liked_countries: prefs.liked_countries.filter(c => c !== id),
                  disliked_countries: prefs.disliked_countries.filter(c => c !== id),
                })}
                includeLabel={t('include')}
                excludeLabel={t('exclude')}
              />
              <CategoryPicker
                label={t('languages')}
                items={languages}
                liked={prefs.liked_languages}
                disliked={prefs.disliked_languages}
                onAddLiked={id => updatePrefs({
                  ...prefs,
                  liked_languages: [...prefs.liked_languages.filter(l => l !== id), id],
                  disliked_languages: prefs.disliked_languages.filter(l => l !== id),
                })}
                onAddDisliked={id => updatePrefs({
                  ...prefs,
                  disliked_languages: [...prefs.disliked_languages.filter(l => l !== id), id],
                  liked_languages: prefs.liked_languages.filter(l => l !== id),
                })}
                onRemove={id => updatePrefs({
                  ...prefs,
                  liked_languages: prefs.liked_languages.filter(l => l !== id),
                  disliked_languages: prefs.disliked_languages.filter(l => l !== id),
                })}
                includeLabel={t('include')}
                excludeLabel={t('exclude')}
              />
            </>
          ) : (
            <div className="space-y-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-muted rounded-md animate-pulse" />
                    <div className="h-8 bg-muted rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── PRODUCTION MODE: unified AI & Account section ────────────────── */}
        {config.hasManagedAI && tempAiConfig && (
          <section className="rounded-xl bg-card border border-border p-5 space-y-4 md:col-span-2">
            {/* Header: section title + AI toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles size={16} className="text-primary" />
                <h2 className="text-sm font-semibold">{t('accountSection')}</h2>
              </div>
              <Switch checked={tempAiConfig.enabled} onCheckedChange={handleAIToggle} disabled={savingAI} />
            </div>

            {user ? (
              /* ── Logged in ── */
              <div className="space-y-3">
                {/* Email + plan badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    <span className="text-muted-foreground">
                      {t('syncSignedInAs')} <span className="text-foreground font-medium">{user.email}</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isPro ? 'bg-primary/15 text-primary' : activatingPlan ? 'bg-amber-500/15 text-amber-600' : 'bg-secondary text-muted-foreground'}`}>
                      {activatingPlan ? <><Loader2 size={11} className="animate-spin" />Activating…</> : isPro ? t('planPro') : t('planFree')}
                    </span>
                    {isPro && cancelAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {t('subscriptionCancelsOn')} {formatDate(cancelAt, lang)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Usage bar — same for both Free and Pro */}
                {aiUsage && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('aiDailyUsage')}</span>
                      <span className="font-medium text-foreground">{aiUsage.used} / {aiUsage.limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}
                      />
                    </div>
                    {aiUsage.remaining === 0 && (
                      <p className="text-xs text-muted-foreground">{t('aiLimitReached')}</p>
                    )}
                  </div>
                )}
                {!aiUsage && !isPro && (
                  <p className="text-xs text-muted-foreground">{t('freeAiLimit')}</p>
                )}
                {!aiUsage && isPro && (
                  <p className="text-xs text-muted-foreground">{t('proAiLimit')}</p>
                )}

                {/* Sync + action buttons */}
                {lastSynced && (
                  <p className="text-xs text-muted-foreground">
                    {t('syncLastSynced')}: {formatLastSynced(lastSynced)}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={triggerSync} disabled={syncing} className="flex items-center gap-1.5">
                    {syncing
                      ? <><Loader2 size={13} className="animate-spin" />{t('syncSyncing')}</>
                      : <><RefreshCw size={13} />{t('syncNow')}</>}
                  </Button>
                  {isPro ? (
                    <Button size="sm" variant="outline" onClick={handleManagePlan} className="flex items-center gap-1.5">
                      <CreditCard size={13} />
                      {t('managePlan')}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUpgrade(false)} className="flex items-center gap-1.5">
                      <CreditCard size={13} />
                      {t('upgradeToPro')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground ml-auto">
                    {t('syncSignOut')}
                  </Button>
                </div>
              </div>
            ) : linkSent ? (
              /* ── Magic link sent ── */
              <div className="flex items-start gap-2.5 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
                <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t('syncEmailSent')}</p>
              </div>
            ) : (
              /* ── Not logged in (Demo mode): show value prop + sign-in form ── */
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary/60 border border-border px-3 py-2.5">
                  <p className="text-xs font-semibold text-foreground">{t('demoModeLabel')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('demoModeDesc')}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{t('signInForFree')}</p>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-0.5">
                    <li className="flex items-center gap-1.5">
                      <Zap size={11} className="text-primary shrink-0" />
                      {t('freeAiLimit')}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Cloud size={11} className="text-primary shrink-0" />
                      {t('proSyncBenefit')}
                    </li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={syncEmail}
                    onChange={e => setSyncEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                    placeholder={t('syncEmailPlaceholder')}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSendLink} disabled={sendingLink || !syncEmail.trim()}>
                    {sendingLink ? <Loader2 size={13} className="animate-spin" /> : t('syncSendLink')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── COMMUNITY MODE: separate AI section (BYO key) ────────────────── */}
        {!config.hasManagedAI && tempAiConfig && (
          <section className="rounded-xl bg-card border border-border p-5 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles size={16} className="text-primary" />
                <h2 className="text-sm font-semibold">{t('aiSettings')}</h2>
              </div>
              <Switch checked={tempAiConfig.enabled} onCheckedChange={handleAIToggle} disabled={savingAI} />
            </div>

            {tempAiConfig.enabled && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('aiProvider')}</label>
                  <Select
                    value={tempAiConfig.provider}
                    onValueChange={(provider: AIProvider) => setTempAiConfig({ ...tempAiConfig, provider })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('aiApiKey')}</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={tempAiConfig.apiKey}
                      onChange={(e) => setTempAiConfig({ ...tempAiConfig, apiKey: e.target.value })}
                      placeholder={tempAiConfig.provider === 'ollama' ? t('aiOptional') : t('aiApiKeyPlaceholder')}
                      className="flex-1"
                    />
                    <Button
                      onClick={saveAIConfig}
                      disabled={savingAI || (!tempAiConfig.apiKey && tempAiConfig.provider !== 'ollama')}
                      size="sm"
                    >
                      {savingAI ? <Loader2 className="animate-spin" size={16} /> : t('save')}
                    </Button>
                  </div>
                </div>

                {tempAiConfig.provider === 'ollama' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('aiOllamaUrl')}</label>
                    <Input
                      value={tempAiConfig.ollamaUrl || 'http://localhost:11434'}
                      onChange={(e) => setTempAiConfig({ ...tempAiConfig, ollamaUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('aiModel')} ({t('aiOptional')})</label>
                  <Input
                    value={tempAiConfig.model || ''}
                    onChange={(e) => setTempAiConfig({ ...tempAiConfig, model: e.target.value })}
                    placeholder={
                      tempAiConfig.provider === 'openai' ? 'gpt-4o-mini' :
                      tempAiConfig.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
                      tempAiConfig.provider === 'gemini' ? 'gemini-1.5-flash' :
                      tempAiConfig.provider === 'mistral' ? 'mistral-small-latest' :
                      'llama3.2'
                    }
                  />
                </div>

                <p className="text-xs text-muted-foreground">{t('aiDescription')}</p>
              </div>
            )}
          </section>
        )}

        {/* ── COMMUNITY MODE: Sync section (only if Supabase configured) ───── */}
        {!config.hasManagedAI && config.hasSync && (
          <section className="rounded-xl bg-card border border-border p-5 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 text-foreground">
              <Cloud size={16} className="text-primary" />
              <h2 className="text-sm font-semibold">{t('syncSection')}</h2>
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    <span className="text-muted-foreground">
                      {t('syncSignedInAs')} <span className="text-foreground font-medium">{user.email}</span>
                    </span>
                  </div>
                </div>
                {lastSynced && (
                  <p className="text-xs text-muted-foreground">
                    {t('syncLastSynced')}: {formatLastSynced(lastSynced)}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={triggerSync} disabled={syncing} className="flex items-center gap-1.5">
                    {syncing
                      ? <><Loader2 size={13} className="animate-spin" />{t('syncSyncing')}</>
                      : <><RefreshCw size={13} />{t('syncNow')}</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground ml-auto">
                    {t('syncSignOut')}
                  </Button>
                </div>
              </div>
            ) : linkSent ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
                <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t('syncEmailSent')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{t('syncDescription')}</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={syncEmail}
                    onChange={e => setSyncEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                    placeholder={t('syncEmailPlaceholder')}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSendLink} disabled={sendingLink || !syncEmail.trim()}>
                    {sendingLink ? <Loader2 size={13} className="animate-spin" /> : t('syncSendLink')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Data — full width */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-foreground">
            <Database size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('dataManagement')}</h2>
          </div>

          

          {!user && (
            
            <div className="pb-2 border-b border-border/50 flex flex-col gap-2">
              {/* Browser ↔ PWA transfer tip — only shown in browser, not in standalone */}
              {!isStandalone && (
                <div className="flex items-start gap-2.5 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
                  <Smartphone size={14} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('pwaTransferTip')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/70 text-sm font-medium transition-colors"
                >
                  <Download size={15} />
                  {t('exportData')}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/70 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Upload size={15} />
                  {importing ? '…' : t('importData')}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('exportDesc')} · {t('importDesc')}</p>

              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          )}

          {stats && (
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t('statWatchlist')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stats.watchlist}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t('statWatched')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stats.watched}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t('statFavourites')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stats.favourites}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t('statTVTracking')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stats.tvTracking}</span>
                </div>
                <div className="flex justify-between items-center text-xs col-span-2 pt-1">
                  <span className="text-muted-foreground">{t('statMovies')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stats.movies}</span>
                </div>
              </div>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 text-sm font-medium transition-colors mt-1">
                <Trash2 size={15} />
                {t('clearAllData')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('clearAllWarning')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('clearAllWarningText')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700 text-white">
                  {t('confirmClear')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>


        </section>

        {/* Import Confirmation Dialog */}
        <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('importData')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('importWarningText') || 'This will replace all your current data (watchlist, watched, favorites, and settings) with the data from the backup file. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={importing}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  confirmImport();
                }}
                disabled={importing}
                className="bg-primary text-primary-foreground"
              >
                {importing ? <Loader2 className="animate-spin" size={15} /> : t('confirmImport') || 'Import and Reload'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* App Info — full width */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <Info size={16} className="text-primary" />
              <h2 className="text-sm font-semibold">{t('appInfo')}</h2>
            </div>
            {checkingUpdate && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><span className="text-foreground font-medium">MyKino</span> — {t('appDescription')}</p>
            <div className="flex flex-wrap items-center gap-3 py-1">
              <p className="flex items-center gap-2">
                {t('version')}: <span className="text-foreground font-medium">{__APP_VERSION__}</span>
              </p>

              {newVersion ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpdate}
                  className="h-7 px-3 text-[10px] animate-fade-in gap-1.5 shadow-lg shadow-primary/20"
                >
                  <RefreshCw size={12} />
                  {t('updateBtn')} ({newVersion})
                </Button>
              ) : (
                <button
                  onClick={checkVersion}
                  disabled={checkingUpdate}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 opacity-60 hover:opacity-100"
                >
                  <RefreshCw size={11} className={checkingUpdate ? 'animate-spin' : ''} />
                  {t('checkUpdate')}
                </button>
              )}
            </div>

            <p>{t('dataStorage')}: IndexedDB<br />
              <span className="text-xs leading-relaxed">{t('localDataNote')}</span>
            </p>
            <p>
              API:{' '}
              <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                TMDB
              </a>
            </p>
            <p>
              {t('analytics')}:{' '}
              <a
                href="https://umami.mokhni.uk/share/fH4J4yX37j8uuyU7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Umami
              </a>
              {' '}
              <span className="text-xs opacity-60">({t('public')})</span>
            </p>
            <p>
              {t('author')}:{' '}
              <a href="https://mokhniuk.online" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Oleg Mokhniuk
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
