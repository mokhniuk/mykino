import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '../db';
import { en } from './en';
import { ua } from './ua';
import { de } from './de';
import { cs } from './cs';
import { pl } from './pl';
import { pt } from './pt';
import { hr } from './hr';
import { it } from './it';
import { es } from './es';

const translations = { en, ua, de, cs, pl, pt, hr, it, es } as const;

export type Lang = 'en' | 'ua' | 'de' | 'cs' | 'pl' | 'pt' | 'hr' | 'it' | 'es';
type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  t: (key: TranslationKey) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  lang: 'en',
  setLang: () => { },
});

const VALID_LANGS = new Set<string>(['en', 'ua', 'de', 'cs', 'pl', 'pt', 'hr', 'it', 'es']);

function getInitialLang(): Lang {
  const saved = localStorage.getItem('lang');
  if (saved && VALID_LANGS.has(saved)) return saved as Lang;
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    // Only hit IndexedDB if localStorage doesn't already have the value
    if (!localStorage.getItem('lang')) {
      getSetting('lang').then((saved) => {
        if (saved && VALID_LANGS.has(saved)) {
          setLangState(saved as Lang);
          localStorage.setItem('lang', saved);
        }
      });
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    setSetting('lang', newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] || key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

const LANG_LOCALE: Record<Lang, string> = {
  en: 'en-GB', ua: 'uk-UA', de: 'de-DE', cs: 'cs-CZ',
  pl: 'pl-PL', pt: 'pt-PT', hr: 'hr-HR', it: 'it-IT', es: 'es-ES',
};

const DATE_FMT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

export function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LANG_LOCALE[lang], DATE_FMT);
}
