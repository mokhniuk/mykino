import React, { useRef, useState, useEffect } from 'react';
import { Globe, Palette, Info, Sun, Moon, Monitor, Database, Download, Upload, RefreshCw, Loader2, ThumbsUp, ThumbsDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { exportAllData, importAllData, getContentPreferences, setContentPreferences, type ContentPreferences } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTmdbMetadata } from '@/hooks/useTmdbMetadata';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mykino-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

function CategoryPicker({ items, onSelect, placeholder }: { items: { id: string | number, label: string }[], onSelect: (id: string | number, type: 'liked' | 'disliked') => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 gap-1.5 text-[10px] uppercase tracking-wider font-bold">
          <Plus size={12} />
          {t('include')} / {t('exclude')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]" align="end">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={String(item.label)}
                  onSelect={() => { }}
                  className="flex items-center justify-between group"
                >
                  <span className="flex-1 truncate mr-2">{item.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item.id, 'liked');
                        setOpen(false);
                      }}
                      className="p-1 hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                      title={t('include')}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item.id, 'disliked');
                        setOpen(false);
                      }}
                      className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                      title={t('exclude')}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
