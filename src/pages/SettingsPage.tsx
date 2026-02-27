import { Globe, Palette, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme, type ThemePreference } from '@/lib/theme';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('lightMode') },
    { value: 'system', label: t('systemMode') },
    { value: 'dark', label: t('darkMode') },
  ];

  return (
    <div className="px-4 md:px-6 max-w-2xl mx-auto animate-fade-in py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl text-foreground mb-6">{t('settings')}</h1>

      {/* Mobile: stacked. Tablet/Desktop: bento grid */}
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
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lang === code
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
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* App Info — full width */}
        <section className="rounded-xl bg-card border border-border p-5 space-y-2 md:col-span-2">
          <div className="flex items-center gap-2 text-foreground">
            <Info size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">{t('appInfo')}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="text-foreground font-medium">MyKino</span> — {t('appDescription')}</p>
            <p>{t('version')}: 1.0.0</p>
            <p>{t('dataStorage')}: IndexedDB</p>
            <p>
              API:{' '}
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                TMDB
              </a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
