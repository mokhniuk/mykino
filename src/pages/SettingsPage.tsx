import React, { useRef, useState, useEffect } from 'react';
import { Globe, Palette, Info, Sun, Moon, Monitor, Database, Download, Upload, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { exportAllData, importAllData } from '@/lib/db';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      setCheckingUpdate(true);
      // Add cache-busting query param
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

  const handleUpdate = () => {
    // Force a full reload to get the new version
    // Also try to unregister service worker if it exists to ensure fresh load
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
    } catch {
      toast.error(t('importError'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

