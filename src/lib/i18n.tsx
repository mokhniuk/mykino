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
    topRatedPick: 'Top rated',
    shuffle: 'Shuffle',
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
    markAsWatched: 'Mark as watched',
    watched: 'Watched',
    watchedSection: 'Already watched',
    // Search
    searchResults: 'Search results',
    noResults: 'No results found',
    typeToSearch: 'Type to search for movies, series, and more...',
    // Settings
    save: 'Save',
    // Lists
    emptyWatchlist: 'No movies in your watchlist',
    emptyFavourites: 'No favourite movies yet',
    startSearching: 'Start searching to add movies',
    tabMovies: 'Movies',
    tabSeries: 'Series',
    emptyMoviesHere: 'No movies saved yet',
    emptySeriesHere: 'No series saved yet',
    emptyHintWatchlist: 'Find films and shows you want to watch and save them here.',
    emptyFavMoviesHere: 'No favourite movies yet',
    emptyFavSeriesHere: 'No favourite series yet',
    emptyHintFavourites: 'Explore films and series, then save your all-time favourites here.',
    discoverNow: 'Discover now',
    searchEmptyTitle: 'What are you in the mood for?',
    searchEmptyBody: 'Search millions of movies, series, documentaries and more.',
    // Theme
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
    // Settings
    settings: 'Settings',
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
    topRatedPick: 'Топ рейтингу',
    shuffle: 'Інший',
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
    markAsWatched: 'Позначити як переглянуте',
    watched: 'Переглянуто',
    watchedSection: 'Вже переглянуто',
    searchResults: 'Результати пошуку',
    noResults: 'Нічого не знайдено',
    typeToSearch: 'Шукайте фільми, серіали та інше...',
    save: 'Зберегти',
    emptyWatchlist: 'Список перегляду порожній',
    emptyFavourites: 'Улюблених фільмів ще немає',
    startSearching: 'Почніть пошук, щоб додати фільми',
    tabMovies: 'Фільми',
    tabSeries: 'Серіали',
    emptyMoviesHere: 'Фільмів ще немає',
    emptySeriesHere: 'Серіалів ще немає',
    emptyHintWatchlist: 'Знаходьте фільми та серіали, які хочете переглянути, і зберігайте їх тут.',
    emptyFavMoviesHere: 'Улюблених фільмів ще немає',
    emptyFavSeriesHere: 'Улюблених серіалів ще немає',
    emptyHintFavourites: 'Досліджуйте кіно та серіали і зберігайте найулюбленіші тут.',
    discoverNow: 'Знайти зараз',
    searchEmptyTitle: 'Що хочеться подивитися?',
    searchEmptyBody: 'Мільйони фільмів, серіалів, документалок та багато іншого.',
    lightMode: 'Світла',
    darkMode: 'Темна',
    systemMode: 'Системна',
    settings: 'Налаштування',
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
