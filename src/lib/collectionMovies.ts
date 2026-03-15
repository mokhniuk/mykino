// ─── Static curated movie lists for editorial collections ─────────────────────
//
// HOW TO ADD MOVIES:
//   1. Find the collection slug (e.g. 'marvel-cinematic-universe')
//   2. Add an entry with TMDB IDs — get them from https://www.themoviedb.org/
//      Movie URL: /movie/550 → id: 550
//      TV URL:    /tv/1396   → id: 1396, tv: true
//   3. Order matters — first items appear first in the collection
//
// Collections without an entry here fall back to TMDB Discover queries.
// ─────────────────────────────────────────────────────────────────────────────

export interface StaticMovie {
  /** TMDB movie or TV show ID */
  id: number;
  /** Set to true for TV shows */
  tv?: boolean;
}

export const COLLECTION_MOVIES: Record<string, StaticMovie[]> = {

  // =========================
  // FRANCHISES
  // =========================

  'marvel-cinematic-universe': [
    { id: 1726 },
    { id: 1724 },
    { id: 10138 },
    { id: 10195 },
    { id: 24428 },
    { id: 68721 },
    { id: 76338 },
    { id: 100402 },
    { id: 118340 },
    { id: 99861 },
    { id: 102899 },
    { id: 271110 },
    { id: 284053 },
    { id: 283995 },
    { id: 315635 },
    { id: 284052 },
    { id: 299536 },
    { id: 299534 },
    { id: 363088 },
    { id: 429617 },
    { id: 447365 },
    { id: 497698 },
    { id: 566525 },
    { id: 524434 },
    { id: 453395 },
    { id: 616037 },
    { id: 634649 },
    { id: 640146 },
    { id: 505642 },
    { id: 533535 }
  ],

  'star-wars-universe': [
    { id: 11 },
    { id: 1891 },
    { id: 1892 },
    { id: 1893 },
    { id: 1894 },
    { id: 1895 },
    { id: 140607 },
    { id: 181808 },
    { id: 330459 },
    { id: 348350 }
  ],

  'dc-universe-movies': [
    { id: 49521 },
    { id: 209112 },
    { id: 297762 },
    { id: 297761 },
    { id: 324857 },
    { id: 141052 },
    { id: 436969 },
    { id: 464052 },
    { id: 297761 },
    { id: 436969 },
    { id: 414906 },
    { id: 791373 },
    { id: 436270 }
  ],

  'wizarding-world': [
    { id: 671 },
    { id: 672 },
    { id: 673 },
    { id: 674 },
    { id: 675 },
    { id: 767 },
    { id: 12445 },
    { id: 259316 },
    { id: 338952 },
    { id: 338953 }
  ],

  'alien-predator-universe': [
    { id: 348 },
    { id: 679 },
    { id: 8077 },
    { id: 8078 },
    { id: 70981 },
    { id: 126889 },
    { id: 135397 },
    { id: 395 },
    { id: 169 },
    { id: 440 },
    { id: 9702 },
    { id: 399579 }
  ],

  'the-lord-of-the-rings-saga': [
    { id: 120 },
    { id: 121 },
    { id: 122 },
    { id: 49051 },
    { id: 57158 },
    { id: 122917 }
  ],

  'james-bond-movies': [
    { id: 646 },
    { id: 657 },
    { id: 658 },
    { id: 660 },
    { id: 667 },
    { id: 668 },
    { id: 681 },
    { id: 698 },
    { id: 699 },
    { id: 700 },
    { id: 36647 },
    { id: 37724 },
    { id: 206647 },
    { id: 370172 }
  ],

  'mission-impossible-movies': [
    { id: 954 },
    { id: 955 },
    { id: 956 },
    { id: 56292 },
    { id: 177677 },
    { id: 353081 },
    { id: 575264 }
  ],

  'fast-furious-saga': [
    { id: 9799 },
    { id: 584 },
    { id: 9615 },
    { id: 13804 },
    { id: 51497 },
    { id: 82992 },
    { id: 168259 },
    { id: 337339 },
    { id: 385128 },
    { id: 384018 }
  ],

  'jurassic-park-franchise': [
    { id: 329 },
    { id: 330 },
    { id: 331 },
    { id: 135397 },
    { id: 351286 },
    { id: 507086 }
  ],

  // =========================
  // STUDIOS
  // =========================

  'pixar-animation-studios-movies': [
    { id: 862 },
    { id: 863 },
    { id: 585 },
    { id: 12 },
    { id: 9806 },
    { id: 14160 },
    { id: 2062 },
    { id: 10681 },
    { id: 150540 },
    { id: 127380 },
    { id: 301528 },
    { id: 508943 },
    { id: 508442 },
    { id: 354912 },
    { id: 508442 }
  ],

  'studio-ghibli-movies': [
    { id: 129 },
    { id: 128 },
    { id: 10515 },
    { id: 12477 },
    { id: 51739 },
    { id: 110420 },
    { id: 4935 },
    { id: 8392 },
    { id: 11849 },
    { id: 37797 }
  ],

  'a24-movies': [
    { id: 264660 },
    { id: 399055 },
    { id: 458576 },
    { id: 587807 },
    { id: 548473 },
    { id: 50014 },
    { id: 398818 },
    { id: 695721 },
    { id: 1029575 },
    { id: 842924 }
  ],

  'dreamworks-animation-movies': [
    { id: 808 },
    { id: 809 },
    { id: 810 },
    { id: 953 },
    { id: 10192 },
    { id: 109445 },
    { id: 166428 },
    { id: 503314 },
    { id: 420821 },
    { id: 459003 }
  ],

  'walt-disney-animation-studios-movies': [
    { id: 9836 },
    { id: 38757 },
    { id: 269149 },
    { id: 177572 },
    { id: 150689 },
    { id: 568124 },
    { id: 527774 },
    { id: 337404 },
    { id: 560057 },
    { id: 438695 }
  ],

  'laika-movies': [
    { id: 14836 },
    { id: 257211 },
    { id: 3933 },
    { id: 291805 },
    { id: 961323 }
  ],

  'illumination-movies': [
    { id: 20352 },
    { id: 93456 },
    { id: 211672 },
    { id: 43074 },
    { id: 512895 },
    { id: 438148 },
    { id: 502356 }
  ],

  'warner-bros-movies': [
    { id: 27205 },
    { id: 155 },
    { id: 157336 },
    { id: 603 },
    { id: 1124 },
    { id: 550 },
    { id: 807 },
    { id: 98 },
    { id: 278 },
    { id: 680 }
  ],

  'legendary-pictures-movies': [
    { id: 157336 },
    { id: 49051 },
    { id: 12445 },
    { id: 49026 },
    { id: 338762 },
    { id: 181812 },
    { id: 373571 },
    { id: 624860 }
  ],

  'blumhouse-productions-movies': [
    { id: 419430 },
    { id: 458723 },
    { id: 493922 },
    { id: 406563 },
    { id: 419479 },
    { id: 228326 },
    { id: 489999 },
    { id: 39451 }
  ],
  'movies-by-christopher-nolan': [
  { id: 77 },
  { id: 27205 },
  { id: 157336 },
  { id: 1124 },
  { id: 49026 },
  { id: 155 },
  { id: 49051 },
  { id: 577922 },
  { id: 872585 }
],

'movies-by-quentin-tarantino': [
  { id: 680 },
  { id: 68718 },
  { id: 24 },
  { id: 16869 },
  { id: 393 },
  { id: 466 },
  { id: 168259 },
  { id: 68718 },
  { id: 496243 }
],

'movies-by-steven-spielberg': [
  { id: 578 },
  { id: 329 },
  { id: 330 },
  { id: 568 },
  { id: 640 },
  { id: 857 },
  { id: 85 },
  { id: 840 },
  { id: 522924 }
],

'movies-by-martin-scorsese': [
  { id: 311 },
  { id: 769 },
  { id: 524 },
  { id: 1422 },
  { id: 11324 },
  { id: 19426 },
  { id: 346364 },
  { id: 398978 }
],

'movies-by-denis-villeneuve': [
  { id: 19995 },
  { id: 329865 },
  { id: 335984 },
  { id: 438631 },
  { id: 490132 },
  { id: 181812 },
  { id: 300668 }
],

'movies-by-ridley-scott': [
  { id: 348 },
  { id: 78 },
  { id: 98 },
  { id: 68718 },
  { id: 559 },
  { id: 76341 },
  { id: 369972 }
],

'movies-by-wes-anderson': [
  { id: 120467 },
  { id: 11545 },
  { id: 116745 },
  { id: 49013 },
  { id: 399055 },
  { id: 42269 },
  { id: 1073 }
],

'movies-by-david-fincher': [
  { id: 807 },
  { id: 550 },
  { id: 37799 },
  { id: 122906 },
  { id: 210577 },
  { id: 2666 },
  { id: 290250 }
],

'movies-by-greta-gerwig': [
  { id: 391713 },
  { id: 346698 },
  { id: 346698 },
  { id: 335983 }
],

'movies-by-hayao-miyazaki': [
  { id: 129 },
  { id: 128 },
  { id: 10515 },
  { id: 12477 },
  { id: 51739 },
  { id: 110420 },
  { id: 4935 },
  { id: 8392 }
],
'movies-with-leonardo-dicaprio': [
  { id: 27205 },
  { id: 157336 },
  { id: 807 },
  { id: 49026 },
  { id: 1422 },
  { id: 11324 },
  { id: 98 },
  { id: 290250 },
  { id: 68718 },
  { id: 640 }
],

'movies-with-tom-hanks': [
  { id: 13 },
  { id: 568 },
  { id: 857 },
  { id: 12 },
  { id: 597 },
  { id: 862 },
  { id: 13 },
  { id: 640 }
],

'movies-with-robert-de-niro': [
  { id: 311 },
  { id: 769 },
  { id: 524 },
  { id: 103 },
  { id: 398978 },
  { id: 111 }
],

'movies-with-scarlett-johansson': [
  { id: 118340 },
  { id: 99861 },
  { id: 271110 },
  { id: 24428 },
  { id: 152601 },
  { id: 315635 }
],

'movies-with-brad-pitt': [
  { id: 550 },
  { id: 807 },
  { id: 49530 },
  { id: 16869 },
  { id: 50014 },
  { id: 335983 }
],

'movies-with-meryl-streep': [
  { id: 24803 },
  { id: 82702 },
  { id: 146233 },
  { id: 180299 }
],

'movies-with-christian-bale': [
  { id: 155 },
  { id: 49026 },
  { id: 1124 },
  { id: 64690 },
  { id: 157336 }
],

'movies-with-keanu-reeves': [
  { id: 603 },
  { id: 245891 },
  { id: 324552 },
  { id: 438650 },
  { id: 28 }
],

'movies-with-emma-stone': [
  { id: 313369 },
  { id: 378064 },
  { id: 316029 },
  { id: 346698 }
],

'movies-with-ryan-gosling': [
  { id: 335984 },
  { id: 64690 },
  { id: 96721 },
  { id: 399055 },
  { id: 82992 }
],
'best-science-fiction-movies': [
  { id: 603 },
  { id: 27205 },
  { id: 157336 },
  { id: 329865 },
  { id: 335984 },
  { id: 49047 },
  { id: 137113 },
  { id: 17431 },
  { id: 62 },
  { id: 686 }
],

'best-horror-movies': [
  { id: 694 },
  { id: 9552 },
  { id: 419430 },
  { id: 493922 },
  { id: 458723 },
  { id: 419479 },
  { id: 539 },
  { id: 234 }
],

'best-romance-movies': [
  { id: 194 },
  { id: 122906 },
  { id: 313369 },
  { id: 13 },
  { id: 11036 }
],

'best-action-movies': [
  { id: 603 },
  { id: 155 },
  { id: 76341 },
  { id: 245891 },
  { id: 324552 },
  { id: 28 },
  { id: 98 },
  { id: 1726 }
],

'best-comedy-movies': [
  { id: 115 },
  { id: 105 },
  { id: 1585 },
  { id: 773 },
  { id: 862 }
],

'best-adventure-movies': [
  { id: 120 },
  { id: 121 },
  { id: 122 },
  { id: 329 },
  { id: 85 }
],

'best-war-movies': [
  { id: 857 },
  { id: 228150 },
  { id: 530915 },
  { id: 423 }
],

'best-western-movies': [
  { id: 33 },
  { id: 429 },
  { id: 68718 },
  { id: 335983 }
],

'best-documentary-movies': [
  { id: 359724 },
  { id: 24188 },
  { id: 281957 }
],

'best-animation-movies': [
  { id: 129 },
  { id: 128 },
  { id: 8587 },
  { id: 508943 },
  { id: 354912 },
  { id: 508442 }
],
'best-sitcoms-ever': [
  { id: 1668, tv: true }, // Friends
  { id: 2316, tv: true }, // The Office
  { id: 1418, tv: true }, // The Big Bang Theory
  { id: 456, tv: true }, // The Simpsons
  { id: 1434, tv: true }, // Family Guy
  { id: 3286, tv: true }, // Malcolm in the Middle
  { id: 1705, tv: true }, // That '70s Show
  { id: 2691, tv: true }  // Two and a Half Men
],

'best-hbo-shows': [
  { id: 1399, tv: true }, // Game of Thrones
  { id: 1396, tv: true }, // Breaking Bad
  { id: 1438, tv: true }, // The Wire
  { id: 60625, tv: true }, // Rick and Morty
  { id: 100088, tv: true }, // The Last of Us
  { id: 1972, tv: true }, // The Sopranos
  { id: 2316, tv: true } // The Office (sometimes licensed)
],

'best-netflix-originals': [
  { id: 66732, tv: true }, // Stranger Things
  { id: 71446, tv: true }, // Money Heist
  { id: 93405, tv: true }, // Squid Game
  { id: 66732, tv: true },
  { id: 71912, tv: true } // The Witcher
],

'best-mini-series': [
  { id: 65930, tv: true }, // Chernobyl
  { id: 76479, tv: true }, // Unbelievable
  { id: 85552, tv: true }, // When They See Us
  { id: 110316, tv: true } // The Queen's Gambit
],

'best-crime-tv-shows': [
  { id: 1396, tv: true },
  { id: 1438, tv: true },
  { id: 1972, tv: true },
  { id: 1402, tv: true }, // The Walking Dead
  { id: 1412, tv: true } // Sons of Anarchy
],

'best-scifi-tv-shows': [
  { id: 66732, tv: true },
  { id: 82856, tv: true }, // The Mandalorian
  { id: 85937, tv: true }, // The Boys
  { id: 60735, tv: true } // The Expanse
],

'best-fantasy-tv-shows': [
  { id: 1399, tv: true },
  { id: 71912, tv: true },
  { id: 71914, tv: true }, // House of the Dragon
  { id: 82856, tv: true }
],

'best-animated-tv-shows': [
  { id: 60625, tv: true },
  { id: 456, tv: true },
  { id: 1434, tv: true },
  { id: 46260, tv: true } // Adventure Time
],

'best-mystery-shows': [
  { id: 1405, tv: true }, // Sherlock
  { id: 100088, tv: true },
  { id: 66732, tv: true }
],

'best-teen-tv-shows': [
  { id: 8514, tv: true }, // Gossip Girl
  { id: 69050, tv: true }, // Riverdale
  { id: 76479, tv: true }
],
'best-movies-of-the-1960s': [
  { id: 62 },
  { id: 311 },
  { id: 335 },
  { id: 10331 }
],

'best-movies-of-the-1970s': [
  { id: 238 },
  { id: 240 },
  { id: 11 },
  { id: 115 }
],

'best-movies-of-the-1980s': [
  { id: 105 },
  { id: 85 },
  { id: 1891 },
  { id: 601 }
],

'best-movies-of-the-1990s': [
  { id: 13 },
  { id: 550 },
  { id: 807 },
  { id: 680 },
  { id: 278 }
],

'best-movies-of-the-2000s': [
  { id: 120 },
  { id: 121 },
  { id: 122 },
  { id: 603 }
],

'best-movies-of-the-2010s': [
  { id: 157336 },
  { id: 76341 },
  { id: 329865 },
  { id: 335984 }
],

'best-movies-of-the-2020s': [
  { id: 438631 },
  { id: 872585 },
  { id: 634649 },
  { id: 640146 }
],
'perfect-date-night-movies': [
  { id: 194 },
  { id: 313369 },
  { id: 122906 },
  { id: 13 }
],

'girls-night-movies': [
  { id: 350 },
  { id: 114150 },
  { id: 346698 }
],

'movies-to-watch-with-friends': [
  { id: 155 },
  { id: 105 },
  { id: 115 },
  { id: 76341 }
],

'movies-that-will-make-you-cry': [
  { id: 13 },
  { id: 597 },
  { id: 228150 }
],

'feelgood-movies': [
  { id: 194 },
  { id: 773 },
  { id: 1585 },
  { id: 122906 }
],

'cozy-sunday-movies': [
  { id: 194 },
  { id: 212778 },
  { id: 773 }
],

'rainy-day-movies': [
  { id: 11324 },
  { id: 335984 },
  { id: 329865 }
],

'late-night-movies': [
  { id: 550 },
  { id: 807 },
  { id: 210577 }
],

'mindbending-movies': [
  { id: 27205 },
  { id: 77 },
  { id: 577922 },
  { id: 335984 }
],

'comfort-movies': [
  { id: 862 },
  { id: 773 },
  { id: 1585 }
],
'cult-classic-movies': [
  { id: 115 },
  { id: 141 },
  { id: 680 },
  { id: 1878 }
],

'mustwatch-movie-classics': [
  { id: 238 },
  { id: 278 },
  { id: 550 },
  { id: 680 }
],

'movies-everyone-should-see-once': [
  { id: 278 },
  { id: 238 },
  { id: 13 },
  { id: 550 },
  { id: 155 }
],
};
