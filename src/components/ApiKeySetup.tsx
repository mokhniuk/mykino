import { useState, useEffect } from 'react';
import { getSetting, setSetting } from '@/lib/db';
import { useI18n } from '@/lib/i18n';
import { KeyRound } from 'lucide-react';

interface ApiKeySetupProps {
  onKeySet: () => void;
}

export default function ApiKeySetup({ onKeySet }: ApiKeySetupProps) {
  const { t } = useI18n();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) return;
    setLoading(true);
    await setSetting('omdb_api_key', key.trim());
    setLoading(false);
    onKeySet();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <KeyRound className="text-primary" size={28} />
        </div>
        <div>
          <h2 className="font-display text-2xl text-foreground mb-2">{t('apiKeyRequired')}</h2>
          <p className="text-sm text-muted-foreground">{t('enterApiKey')}</p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t('apiKeyPlaceholder')}
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-shadow"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!key.trim() || loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
        <a
          href="https://www.omdbapi.com/apikey.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-block"
        >
          {t('getApiKey')}
        </a>
      </div>
    </div>
  );
}
