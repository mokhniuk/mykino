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
    top100Challenge: 'Top 100 Challenge',
    top100Unlocked: 'unlocked',
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
    whereToWatch: 'Where to Watch',
    stream: 'Stream',
    rent: 'Rent',
    buy: 'Buy',
    more: 'More',
    showLess: 'Show less',
    notAvailableInCountry: 'Not available in',
    notInCountry: 'Not in',
    changeCountry: 'Change country',
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
    tabAll: 'All',
    tabMovies: 'Movies',
    tabSeries: 'Series',
    emptyMoviesHere: 'No movies saved yet',
    emptySeriesHere: 'No series saved yet',
    emptyHintWatchlist: 'Find films and shows you want to watch and save them here.',
    emptyFavMoviesHere: 'No favourite movies yet',
    emptyFavSeriesHere: 'No favourite series yet',
    emptyHintFavourites: 'Explore films and series, then save your all-time favourites here.',
    emptyWatchedMoviesHere: 'No watched movies yet',
    emptyWatchedSeriesHere: 'No watched series yet',
    emptyHintWatched: 'Mark movies and series as watched and find them here.',
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
    top100Challenge: 'Топ 100 Виклик',
    top100Unlocked: 'відкрито',
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
    whereToWatch: 'Де дивитися',
    stream: 'Стрімінг',
    rent: 'Оренда',
    buy: 'Купити',
    more: 'Ще',
    showLess: 'Згорнути',
    notAvailableInCountry: 'Недоступно в',
    notInCountry: 'Не в',
    changeCountry: 'Змінити країну',
    addToWatchlist: 'Додати до списку',
    removeFromWatchlist: 'Видалити зі списку',
    addToFavourites: 'Додати до улюблених',
    removeFromFavourites: 'Видалити з улюблених',
    markAsWatched: 'Позначити як переглянуте',
    watched: 'Переглянуто',
    watchedSection: 'Переглянуто',
    searchResults: 'Результати пошуку',
    noResults: 'Нічого не знайдено',
    typeToSearch: 'Шукайте фільми, серіали та інше...',
    save: 'Зберегти',
    emptyWatchlist: 'Список перегляду порожній',
    emptyFavourites: 'Улюблених фільмів ще немає',
    startSearching: 'Почніть пошук, щоб додати фільми',
    tabAll: 'Всі',
    tabMovies: 'Фільми',
    tabSeries: 'Серіали',
    emptyMoviesHere: 'Фільмів ще немає',
    emptySeriesHere: 'Серіалів ще немає',
    emptyHintWatchlist: 'Знаходьте фільми та серіали, які хочете переглянути, і зберігайте їх тут.',
    emptyFavMoviesHere: 'Улюблених фільмів ще немає',
    emptyFavSeriesHere: 'Улюблених серіалів ще немає',
    emptyHintFavourites: 'Досліджуйте кіно та серіали і зберігайте найулюбленіші тут.',
    emptyWatchedMoviesHere: 'Переглянутих фільмів ще немає',
    emptyWatchedSeriesHere: 'Переглянутих серіалів ще немає',
    emptyHintWatched: 'Позначайте фільми та серіали як переглянуті — вони з\'являться тут.',
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
  de: {
    goodMorning: 'Guten Morgen',
    goodAfternoon: 'Guten Tag',
    goodEvening: 'Guten Abend',
    readyToWatch: 'Bereit, etwas zu schauen?',
    fromYourWatchlist: 'Aus deiner Merkliste',
    searchForMovies: 'Filme suchen...',
    noWatchlistYet: 'Deine Merkliste ist leer',
    addMoviesToWatchlist: 'Suche nach Filmen und füge sie zur Merkliste hinzu',
    todaysPick: 'Tipp des Tages',
    topRatedPick: 'Top bewertet',
    shuffle: 'Anderer',
    top100Challenge: 'Top 100 Herausforderung',
    top100Unlocked: 'freigeschaltet',
    home: 'Startseite',
    search: 'Suche',
    watchlist: 'Merkliste',
    favourites: 'Favoriten',
    director: 'Regisseur',
    actors: 'Schauspieler',
    writer: 'Drehbuch',
    genre: 'Genre',
    runtime: 'Laufzeit',
    released: 'Erscheinungsdatum',
    rated: 'FSK',
    language: 'Sprache',
    country: 'Land',
    awards: 'Auszeichnungen',
    boxOffice: 'Einspielergebnis',
    imdbRating: 'IMDb-Bewertung',
    metascore: 'Metascore',
    plot: 'Handlung',
    whereToWatch: 'Wo schauen',
    stream: 'Streamen',
    rent: 'Leihen',
    buy: 'Kaufen',
    more: 'Mehr',
    showLess: 'Weniger',
    notAvailableInCountry: 'Nicht verfügbar in',
    notInCountry: 'Nicht in',
    changeCountry: 'Land ändern',
    addToWatchlist: 'Zur Merkliste hinzufügen',
    removeFromWatchlist: 'Von der Merkliste entfernen',
    addToFavourites: 'Zu Favoriten hinzufügen',
    removeFromFavourites: 'Aus Favoriten entfernen',
    markAsWatched: 'Als gesehen markieren',
    watched: 'Gesehen',
    watchedSection: 'Bereits gesehen',
    searchResults: 'Suchergebnisse',
    noResults: 'Keine Ergebnisse gefunden',
    typeToSearch: 'Suche nach Filmen, Serien und mehr...',
    save: 'Speichern',
    emptyWatchlist: 'Keine Filme in der Merkliste',
    emptyFavourites: 'Noch keine Lieblingsfilme',
    startSearching: 'Suche starten, um Filme hinzuzufügen',
    tabAll: 'Alle',
    tabMovies: 'Filme',
    tabSeries: 'Serien',
    emptyMoviesHere: 'Noch keine Filme gespeichert',
    emptySeriesHere: 'Noch keine Serien gespeichert',
    emptyHintWatchlist: 'Finde Filme und Serien, die du sehen möchtest, und speichere sie hier.',
    emptyFavMoviesHere: 'Noch keine Lieblingsfilme',
    emptyFavSeriesHere: 'Noch keine Lieblingsserien',
    emptyHintFavourites: 'Entdecke Filme und Serien und speichere deine absoluten Favoriten hier.',
    emptyWatchedMoviesHere: 'Noch keine gesehenen Filme',
    emptyWatchedSeriesHere: 'Noch keine gesehenen Serien',
    emptyHintWatched: 'Markiere Filme und Serien als gesehen und finde sie hier.',
    discoverNow: 'Jetzt entdecken',
    searchEmptyTitle: 'Wonach ist dir der Sinn?',
    searchEmptyBody: 'Millionen von Filmen, Serien, Dokumentationen und mehr.',
    lightMode: 'Hell',
    darkMode: 'Dunkel',
    systemMode: 'System',
    settings: 'Einstellungen',
    languageSetting: 'Sprache',
    themeSetting: 'Design',
    appInfo: 'Über die App',
    appDescription: 'Dein persönlicher Film-Begleiter',
    version: 'Version',
    dataStorage: 'Speicher',
    switchLanguage: 'DE',
  },
} as const;

type Lang = 'en' | 'ua' | 'de';
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

function getInitialLang(): Lang {
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'ua' || saved === 'de') return saved;
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    // Only hit IndexedDB if localStorage doesn't already have the value
    if (!localStorage.getItem('lang')) {
      getSetting('lang').then((saved) => {
        if (saved === 'en' || saved === 'ua' || saved === 'de') {
          setLangState(saved);
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
