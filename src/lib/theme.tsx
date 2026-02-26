import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting, setSetting } from './db';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
});

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

function applyTheme(pref: ThemePreference) {
  document.documentElement.classList.toggle('dark', resolveTheme(pref) === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    getSetting('theme').then((saved) => {
      const pref: ThemePreference =
        saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
      setThemeState(pref);
      applyTheme(pref);
    });
  }, []);

  // Re-apply when OS preference changes (only relevant when theme === 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setThemeState((current) => {
        applyTheme(current);
        return current;
      });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = (pref: ThemePreference) => {
    setThemeState(pref);
    applyTheme(pref);
    setSetting('theme', pref);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
