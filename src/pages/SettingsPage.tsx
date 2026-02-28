import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, Palette, Info, Sun, Moon, Monitor, Database, Download, Upload, RefreshCw, Loader2, ThumbsUp, ThumbsDown, Plus, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { exportAllData, importAllData, getContentPreferences, setContentPreferences, type ContentPreferences } from '@/lib/db';
import { triggerSWUpdate } from '@/lib/sw-update';
import { clearRecommendationsCache } from '@/lib/recommendations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTmdbMetadata } from '@/hooks/useTmdbMetadata';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<ContentPreferences | null>(null);

  // Use optimized metadata hook
  const { genres, countries, languages, isLoading: metadataLoading } = useTmdbMetadata();

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

  const loadPreferences = async () => {
    const p = await getContentPreferences();
    setPrefs(p);
  };

  useEffect(() => {
    checkVersion();
    loadPreferences();
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
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.watchlist && !data.watched && !data.favourites) throw new Error();
      await importAllData(data);
      toast.success(t('importSuccess'));
      loadPreferences();
    } catch {
      toast.error(t('importError'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updatePrefs = async (newPrefs: ContentPreferences) => {
    setPrefs(newPrefs);
    await setContentPreferences(newPrefs);
    clearRecommendationsCache(lang);
    queryClient.invalidateQueries({ queryKey: ['recommendations', lang] });
  };

  const toggleItem = (category: keyof ContentPreferences, id: string | number, type: 'liked' | 'disliked') => {
    if (!prefs) return;

    const baseKey = category.split('_')[1]; // genres, countries, languages
    const likedKey = `liked_${baseKey}` as keyof ContentPreferences;
    const dislikedKey = `disliked_${baseKey}` as keyof ContentPreferences;

    const newPrefs = { ...prefs };
    const targetKey = type === 'liked' ? likedKey : dislikedKey;
    const otherKey = type === 'liked' ? dislikedKey : likedKey;

    const targetList = [...(newPrefs[targetKey] as any[])];
    const otherList = [...(newPrefs[otherKey] as any[])];

    const idx = targetList.indexOf(id);
    if (idx > -1) {
      targetList.splice(idx, 1);
    } else {
      targetList.push(id);
      const otherIdx = otherList.indexOf(id);
      if (otherIdx > -1) otherList.splice(otherIdx, 1);
    }

    (newPrefs[targetKey] as any[]) = targetList;
    (newPrefs[otherKey] as any[]) = otherList;

    updatePrefs(newPrefs);
  };

  const removeItem = (id: string | number) => {
    if (!prefs) return;
    const newPrefs = { ...prefs };
    const keys: (keyof ContentPreferences)[] = [
      'liked_genres', 'disliked_genres',
      'liked_countries', 'disliked_countries',
      'liked_languages', 'disliked_languages'
    ];

    keys.forEach(key => {
      (newPrefs[key] as any[]) = (newPrefs[key] as any[]).filter(i => i !== id);
    });

    updatePrefs(newPrefs);
  };

  const themeOptions: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('lightMode'), icon: <Sun size={15} /> },
    { value: 'system', label: t('systemMode'), icon: <Monitor size={15} /> },
    { value: 'dark', label: t('darkMode'), icon: <Moon size={15} /> },
  ];

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto animate-fade-in py-4 md:py-8 space-y-4">
      <h1 className="text-2xl md:text-3xl text-foreground mb-6">{t('settings')}</h1>

      <section className="rounded-xl bg-card border border-border p-5 space-y-6 md:col-span-2">
        <div className="flex items-center gap-2 text-foreground">
          <ThumbsUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">{t('contentSettings')}</h2>
        </div>

        <div className="space-y-6">
          {metadataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <>
              {/* Genres */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('genres')}</h3>
                  <CategoryPicker
                    items={genres}
                    onSelect={(id, type) => toggleItem(type === 'liked' ? 'liked_genres' : 'disliked_genres', id, type)}
                    placeholder={t('selectGenre')}
                    likedIds={new Set(prefs?.liked_genres ?? [])}
                    dislikedIds={new Set(prefs?.disliked_genres ?? [])}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {prefs?.liked_genres.map(id => (
                    <PreferenceBadge key={id} id={id} label={genres.find(g => g.id === id)?.label || String(id)} type="liked" onRemove={removeItem} />
                  ))}
                  {prefs?.disliked_genres.map(id => (
                    <PreferenceBadge key={id} id={id} label={genres.find(g => g.id === id)?.label || String(id)} type="disliked" onRemove={removeItem} />
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('countries')}</h3>
                  <CategoryPicker
                    items={countries}
                    onSelect={(id, type) => toggleItem(type === 'liked' ? 'liked_countries' : 'disliked_countries', id, type)}
                    placeholder={t('selectCountry')}
                    likedIds={new Set(prefs?.liked_countries ?? [])}
                    dislikedIds={new Set(prefs?.disliked_countries ?? [])}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {prefs?.liked_countries.map(id => (
                    <PreferenceBadge key={id} id={id} label={countries.find(c => c.id === id)?.label || String(id)} type="liked" onRemove={removeItem} />
                  ))}
                  {prefs?.disliked_countries.map(id => (
                    <PreferenceBadge key={id} id={id} label={countries.find(c => c.id === id)?.label || String(id)} type="disliked" onRemove={removeItem} />
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('languages')}</h3>
                  <CategoryPicker
                    items={languages}
                    onSelect={(id, type) => toggleItem(type === 'liked' ? 'liked_languages' : 'disliked_languages', id, type)}
                    placeholder={t('selectLanguage')}
                    likedIds={new Set(prefs?.liked_languages ?? [])}
                    dislikedIds={new Set(prefs?.disliked_languages ?? [])}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {prefs?.liked_languages.map(id => (
                    <PreferenceBadge key={id} id={id} label={languages.find(l => l.id === id)?.label || String(id)} type="liked" onRemove={removeItem} />
                  ))}
                  {prefs?.disliked_languages.map(id => (
                    <PreferenceBadge key={id} id={id} label={languages.find(l => l.id === id)?.label || String(id)} type="disliked" onRemove={removeItem} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        {/* Language */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Globe size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('languageSetting')}</h2>
          </div>
          <div className="flex gap-2">
            {([
              { code: 'en', label: 'English' },
              { code: 'ua', label: 'Українська' },
              { code: 'de', label: 'Deutsch' },
            ] as const).map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${lang === code
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
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

        {/* Data — full width */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-foreground">
            <Database size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('dataManagement')}</h2>
          </div>

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
        </section>

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

            <p>{t('dataStorage')}: IndexedDB</p>
            <p>
              API:{' '}
              <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                TMDB
              </a>
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

function PreferenceBadge({ id, label, type, onRemove }: { id: string | number, label: string, type: 'liked' | 'disliked', onRemove: (id: string | number) => void }) {
  return (
    <Badge
      variant={type === 'liked' ? 'default' : 'destructive'}
      className="gap-1 px-2 py-1 h-7 animate-fade-in"
    >
      {type === 'liked' ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
      <span className="max-w-[120px] truncate">{label}</span>
      <button onClick={() => onRemove(id)} className="ml-1 hover:text-white/70 transition-colors">
        <X size={12} />
      </button>
    </Badge>
  );
}

function CategoryPicker({ items, onSelect, placeholder, likedIds, dislikedIds }: {
  items: { id: string | number, label: string }[],
  onSelect: (id: string | number, type: 'liked' | 'disliked') => void,
  placeholder: string,
  likedIds: Set<string | number>,
  dislikedIds: Set<string | number>,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const { t } = useI18n();

  const sorted = [...items].sort((a, b) => {
    const aLiked = likedIds.has(a.id) ? 0 : dislikedIds.has(a.id) ? 1 : 2;
    const bLiked = likedIds.has(b.id) ? 0 : dislikedIds.has(b.id) ? 1 : 2;
    return aLiked - bLiked;
  });

  const filtered = search
    ? sorted.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const handleSelect = (id: string | number, type: 'liked' | 'disliked') => {
    onSelect(id, type);
    setOpen(false);
    setSearch('');
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setSearch('');
  };

  const trigger = (
    <Button variant="outline" size="sm" className="h-7 px-2 gap-1.5 text-[10px] uppercase tracking-wider font-bold">
      <Plus size={12} />
      {t('include')} / {t('exclude')}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-base text-left">{placeholder}</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-3 border-b border-border">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No results found.</p>
            ) : filtered.map(item => {
              const isLiked = likedIds.has(item.id);
              const isDisliked = dislikedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 border-b border-border/40 ${isLiked ? 'bg-primary/5' : isDisliked ? 'bg-destructive/5' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
                    {isLiked && <ThumbsUp size={12} className="text-primary shrink-0" />}
                    {isDisliked && <ThumbsDown size={12} className="text-destructive shrink-0" />}
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSelect(item.id, 'liked')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${isLiked ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}
                    >
                      <ThumbsUp size={13} />
                      {t('include')}
                    </button>
                    <button
                      onClick={() => handleSelect(item.id, 'disliked')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${isDisliked ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive'}`}
                    >
                      <ThumbsDown size={13} />
                      {t('exclude')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="end">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((item) => {
                const isLiked = likedIds.has(item.id);
                const isDisliked = dislikedIds.has(item.id);
                return (
                  <CommandItem
                    key={item.id}
                    value={String(item.label)}
                    onSelect={() => { }}
                    className={`flex items-center justify-between ${isLiked ? 'bg-primary/5' : isDisliked ? 'bg-destructive/5' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                      {isLiked && <ThumbsUp size={11} className="text-primary shrink-0" />}
                      {isDisliked && <ThumbsDown size={11} className="text-destructive shrink-0" />}
                      <span className="truncate text-sm">{item.label}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelect(item.id, 'liked'); }}
                        className={`p-1.5 rounded-lg transition-colors ${isLiked ? 'bg-primary text-primary-foreground' : 'hover:bg-primary hover:text-primary-foreground'}`}
                        title={t('include')}
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelect(item.id, 'disliked'); }}
                        className={`p-1.5 rounded-lg transition-colors ${isDisliked ? 'bg-destructive text-destructive-foreground' : 'hover:bg-destructive hover:text-destructive-foreground'}`}
                        title={t('exclude')}
                      >
                        <ThumbsDown size={13} />
                      </button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
