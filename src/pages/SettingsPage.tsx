import { useState, useEffect } from 'react';
import { KeyRound, Globe, Palette, Info, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { getSetting, setSetting } from '@/lib/db';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('omdb_api_key').then((key) => {
      if (key) {
        setSavedKey(key);
        setApiKey(key);
      }
    });
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    await setSetting('omdb_api_key', apiKey.trim());
    setSavedKey(apiKey.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const maskedKey = savedKey ? savedKey.slice(0, 3) + '••••••' + savedKey.slice(-2) : '';

  return (
    <div className="px-4 md:px-6 max-w-lg mx-auto space-y-6 animate-fade-in py-4">
      <h1 className="text-2xl md:text-3xl text-foreground">{t('settings')}</h1>

      {/* API Key */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <KeyRound size={18} className="text-primary" />
          <h2 className="text-base font-medium font-sans">{t('apiKey')}</h2>
        </div>
        {savedKey && (
          <p className="text-xs text-muted-foreground">
            {t('currentKey')}: <span className="font-mono">{maskedKey}</span>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
            placeholder={t('apiKeyPlaceholder')}
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-shadow"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
          />
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saved ? '✓' : t('save')}
          </button>
        </div>
        <a
          href="https://www.omdbapi.com/apikey.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          {t('getApiKey')} <ExternalLink size={10} />
        </a>
      </section>

      {/* Language */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Globe size={18} className="text-primary" />
          <h2 className="text-base font-medium font-sans">{t('languageSetting')}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              lang === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ua')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              lang === 'ua'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Українська
          </button>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Palette size={18} className="text-primary" />
          <h2 className="text-base font-medium font-sans">{t('themeSetting')}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('lightMode')}
          </button>
          <button
            onClick={() => theme === 'light' && toggleTheme()}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('darkMode')}
          </button>
        </div>
      </section>

      {/* App Info */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 text-foreground">
          <Info size={18} className="text-primary" />
          <h2 className="text-base font-medium font-sans">{t('appInfo')}</h2>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">CineList</span> — {t('appDescription')}</p>
          <p>{t('version')}: 1.0.0</p>
          <p>{t('dataStorage')}: IndexedDB</p>
          <p>
            API:{' '}
            <a
              href="https://www.omdbapi.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OMDb API
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
