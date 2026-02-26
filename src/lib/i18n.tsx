import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from './db';

const translations = {
  en: {
    // Greetings
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    // Home
    readyToWatch: 'Ready to watch something?',
    fromYourWatchlist: 'From your watchlist',
    searchForMovies: 'Search for movies...',
    noWatchlistYet: 'Your watchlist is empty',
    addMoviesToWatchlist: 'Search for movies and add them to your watchlist',
    todaysPick: "Today's pick",
    // Nav
    home: 'Home',
    search: 'Search',
    watchlist: 'Watchlist',
    favourites: 'Favourites',
    // Movie
    director: 'Director',
    actors: 'Actors',
    writer: 'Writer',
    genre: 'Genre',
    runtime: 'Runtime',
    released: 'Released',
    rated: 'Rated',
    language: 'Language',
    country: 'Country',
    awards: 'Awards',
    boxOffice: 'Box Office',
    imdbRating: 'IMDb Rating',
    metascore: 'Metascore',
    plot: 'Plot',
    addToWatchlist: 'Add to Watchlist',
    removeFromWatchlist: 'Remove from Watchlist',
    addToFavourites: 'Add to Favourites',
    removeFromFavourites: 'Remove from Favourites',
    // Search
    searchResults: 'Search results',
    noResults: 'No results found',
    typeToSearch: 'Type to search for movies, series, and more...',
    // Settings
    apiKeyRequired: 'API Key Required',
    enterApiKey: 'Enter your OMDB API key to get started',
    getApiKey: 'Get a free key at omdbapi.com',
    apiKeyPlaceholder: 'Enter your API key...',
    save: 'Save',
    // Lists
    emptyWatchlist: 'No movies in your watchlist',
    emptyFavourites: 'No favourite movies yet',
    startSearching: 'Start searching to add movies',
    // Theme
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    // Settings
    settings: 'Settings',
    apiKey: 'API Key',
    currentKey: 'Current key',
    languageSetting: 'Language',
    themeSetting: 'Theme',
    appInfo: 'About',
    appDescription: 'Your personal movie companion',
    version: 'Version',
    dataStorage: 'Storage',
    switchLanguage: 'UA',
  },
  ua: {
    goodMorning: 'Доброго ранку',
    goodAfternoon: 'Доброго дня',
    goodEvening: 'Доброго вечора',
    readyToWatch: 'Готові щось подивитися?',
    fromYourWatchlist: 'З вашого списку',
    searchForMovies: 'Пошук фільмів...',
    noWatchlistYet: 'Ваш список порожній',
    addMoviesToWatchlist: 'Шукайте фільми та додавайте до списку',
    todaysPick: 'Вибір дня',
    home: 'Головна',
    search: 'Пошук',
    watchlist: 'Список',
    favourites: 'Улюблені',
    director: 'Режисер',
    actors: 'Актори',
    writer: 'Сценарист',
    genre: 'Жанр',
    runtime: 'Тривалість',
    released: 'Дата виходу',
    rated: 'Рейтинг',
    language: 'Мова',
    country: 'Країна',
    awards: 'Нагороди',
    boxOffice: 'Касові збори',
    imdbRating: 'Рейтинг IMDb',
    metascore: 'Metascore',
    plot: 'Сюжет',
    addToWatchlist: 'Додати до списку',
    removeFromWatchlist: 'Видалити зі списку',
    addToFavourites: 'Додати до улюблених',
    removeFromFavourites: 'Видалити з улюблених',
    searchResults: 'Результати пошуку',
    noResults: 'Нічого не знайдено',
    typeToSearch: 'Шукайте фільми, серіали та інше...',
    apiKeyRequired: 'Потрібен API ключ',
    enterApiKey: 'Введіть ваш OMDB API ключ для початку',
    getApiKey: 'Отримайте безкоштовний ключ на omdbapi.com',
    apiKeyPlaceholder: 'Введіть API ключ...',
    save: 'Зберегти',
    emptyWatchlist: 'Список перегляду порожній',
    emptyFavourites: 'Улюблених фільмів ще немає',
    startSearching: 'Почніть пошук, щоб додати фільми',
    lightMode: 'Світла тема',
    darkMode: 'Темна тема',
    settings: 'Налаштування',
    apiKey: 'API Ключ',
    currentKey: 'Поточний ключ',
    languageSetting: 'Мова',
    themeSetting: 'Тема',
    appInfo: 'Про додаток',
    appDescription: 'Ваш персональний кіно-помічник',
    version: 'Версія',
    dataStorage: 'Сховище',
    switchLanguage: 'EN',
  },
} as const;

type Lang = 'en' | 'ua';
type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  t: (key: TranslationKey) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  lang: 'en',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    getSetting('lang').then((saved) => {
      if (saved === 'en' || saved === 'ua') setLangState(saved);
    });
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    setSetting('lang', newLang);
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
