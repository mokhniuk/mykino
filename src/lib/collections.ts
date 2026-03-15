// ─── Collection types ─────────────────────────────────────────────────────────

export type CollectionType =
  | 'franchise' | 'studio' | 'director' | 'actor'
  | 'genre' | 'tv' | 'decade' | 'mood' | 'awards'
  | 'theme' | 'classics';

/** Whether the collection uses a static curated list or TMDB Discover. */
export type CollectionSource = 'editorial' | 'tmdb';

/**
 * TMDB Discover query parameters — used when source === 'tmdb'.
 * Person / company IDs must be pre-resolved (no runtime name lookups).
 * Multiple genre IDs: use '878|53' for OR, '878,53' for AND.
 */
export interface DiscoverParams {
  media_type?: 'movie' | 'tv';
  sort_by?: string;
  with_genres?: number | string;
  with_companies?: number | string;
  /** TMDB person ID — discovers movies where person is in the cast */
  with_cast?: number;
  /** TMDB person ID — discovers movies where person is in the crew */
  with_crew?: number;
  /** TMDB TV network ID */
  with_networks?: number;
  /** TMDB TV show type (2 = Miniseries) */
  with_type?: number;
  vote_count_gte?: number;
  vote_average_gte?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
}

export interface Collection {
  title: string;
  slug: string;
  type: CollectionType;
  description: string;
  /** 'editorial' → static list from collectionMovies.ts | 'tmdb' → TMDB Discover */
  source: CollectionSource;
  /** Required when source === 'tmdb' */
  discover?: DiscoverParams;
  /**
   * Official TMDB Collection ID(s) for editorial franchises.
   * When set, fetchCollectionMovies uses /collection/{id} instead of the static list.
   * Collections WITHOUT this field (e.g. MCU, DC) are hidden for non-authenticated users.
   */
  tmdbCollectionId?: number | number[];
}

// ─── Free tier limit ──────────────────────────────────────────────────────────

/** Number of editorial collections available to free (signed-in) users. */
export const FREE_COLLECTIONS_LIMIT = 5;

// ─── Collection definitions ───────────────────────────────────────────────────

export const COLLECTIONS: Collection[] = [

  // ── Franchises — editorial ────────────────────────────────────────────────
  // Collections with tmdbCollectionId use TMDB's /collection/{id} endpoint and
  // are accessible to non-authenticated users. Those without (MCU, DC) rely on
  // curated static lists and are hidden for non-authenticated users.
  {
    title: 'Marvel Cinematic Universe',
    slug: 'marvel-cinematic-universe',
    type: 'franchise',
    description: 'Every film in the Marvel Cinematic Universe, in release order.',
    source: 'editorial',
    // No single TMDB collection covers the full MCU — uses static curated list.
  },
  {
    title: 'Star Wars Universe',
    slug: 'star-wars-universe',
    type: 'franchise',
    description: 'The Skywalker Saga and standalone stories from a galaxy far, far away.',
    source: 'editorial',
    tmdbCollectionId: 10, // Star Wars Collection (9 mainline films)
  },
  {
    title: 'DC Universe Movies',
    slug: 'dc-universe-movies',
    type: 'franchise',
    description: 'Films from the DC Extended Universe and the Dark Knight trilogy.',
    source: 'editorial',
    // No single TMDB collection covers the full DCU — uses static curated list.
  },
  {
    title: 'Wizarding World',
    slug: 'wizarding-world',
    type: 'franchise',
    description: 'Harry Potter and Fantastic Beasts — the complete Wizarding World.',
    source: 'editorial',
    tmdbCollectionId: [1241, 435259], // Harry Potter + Fantastic Beasts
  },
  {
    title: 'Alien & Predator Universe',
    slug: 'alien-predator-universe',
    type: 'franchise',
    description: 'The full Alien and Predator film franchise.',
    source: 'editorial',
    tmdbCollectionId: [8091, 399, 115762], // Alien + Predator + AVP
  },
  {
    title: 'The Lord of the Rings Saga',
    slug: 'the-lord-of-the-rings-saga',
    type: 'franchise',
    description: 'Tolkien\'s Middle-earth — the LotR trilogy and The Hobbit.',
    source: 'editorial',
    tmdbCollectionId: [119, 121938], // The Lord of the Rings + The Hobbit
  },
  {
    title: 'James Bond Movies',
    slug: 'james-bond-movies',
    type: 'franchise',
    description: 'Every official James Bond film across six decades.',
    source: 'editorial',
    tmdbCollectionId: 645, // James Bond Collection (26 films)
  },
  {
    title: 'Mission: Impossible Movies',
    slug: 'mission-impossible-movies',
    type: 'franchise',
    description: 'Tom Cruise\'s globe-trotting spy action franchise.',
    source: 'editorial',
    tmdbCollectionId: 87359, // Mission: Impossible Collection (8 films)
  },
  {
    title: 'Fast & Furious Saga',
    slug: 'fast-furious-saga',
    type: 'franchise',
    description: 'Family, fast cars, and impossible stunts.',
    source: 'editorial',
    tmdbCollectionId: 9485, // The Fast and the Furious Collection (10 films)
  },
  {
    title: 'Jurassic Park Franchise',
    slug: 'jurassic-park-franchise',
    type: 'franchise',
    description: 'Life finds a way — the complete dinosaur adventure series.',
    source: 'editorial',
    tmdbCollectionId: 328, // Jurassic Park Collection (7 films)
  },

  // ── Studios — TMDB Discover by company ID ────────────────────────────────
  {
    title: 'Pixar Animation Studios',
    slug: 'pixar-animation-studios-movies',
    type: 'studio',
    description: 'Every feature film from Pixar, ranked by audience acclaim.',
    source: 'tmdb',
    discover: { with_companies: 3, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Studio Ghibli Movies',
    slug: 'studio-ghibli-movies',
    type: 'studio',
    description: 'The magical, handcrafted worlds of Studio Ghibli.',
    source: 'tmdb',
    discover: { with_companies: 10342, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'A24 Movies',
    slug: 'a24-movies',
    type: 'studio',
    description: 'Bold, auteur-driven cinema from the most talked-about studio in Hollywood.',
    source: 'tmdb',
    discover: { with_companies: 41077, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'DreamWorks Animation',
    slug: 'dreamworks-animation-movies',
    type: 'studio',
    description: 'Animated adventures from Shrek to How to Train Your Dragon.',
    source: 'tmdb',
    discover: { with_companies: 521, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Walt Disney Animation',
    slug: 'walt-disney-animation-studios-movies',
    type: 'studio',
    description: 'The timeless classics and modern hits from Disney Animation.',
    source: 'tmdb',
    discover: { with_companies: 6125, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Laika Movies',
    slug: 'laika-movies',
    type: 'studio',
    description: 'Stop-motion masterpieces — Coraline, Kubo, and more.',
    source: 'tmdb',
    discover: { with_companies: 12236, sort_by: 'vote_average.desc', vote_count_gte: 20 },
  },
  {
    title: 'Illumination Movies',
    slug: 'illumination-movies',
    type: 'studio',
    description: 'Minions, Despicable Me, and crowd-pleasing animated fun.',
    source: 'tmdb',
    discover: { with_companies: 6704, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Warner Bros. Movies',
    slug: 'warner-bros-movies',
    type: 'studio',
    description: 'A century of cinema from one of Hollywood\'s great studios.',
    source: 'tmdb',
    discover: { with_companies: 174, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Legendary Pictures',
    slug: 'legendary-pictures-movies',
    type: 'studio',
    description: 'Epic blockbusters — Nolan\'s Batman, Godzilla, Dune, and more.',
    source: 'tmdb',
    discover: { with_companies: 923, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Blumhouse Productions',
    slug: 'blumhouse-productions-movies',
    type: 'studio',
    description: 'Low-budget, high-impact horror and thriller films.',
    source: 'tmdb',
    discover: { with_companies: 3172, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },

  // ── Directors — TMDB Discover by crew person ID ──────────────────────────
  {
    title: 'Christopher Nolan',
    slug: 'movies-by-christopher-nolan',
    type: 'director',
    description: 'Mind-bending blockbusters from one of cinema\'s greatest architects.',
    source: 'tmdb',
    discover: { with_crew: 525, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Quentin Tarantino',
    slug: 'movies-by-quentin-tarantino',
    type: 'director',
    description: 'Stylised violence, razor-sharp dialogue, and unforgettable soundtracks.',
    source: 'tmdb',
    discover: { with_crew: 138, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Steven Spielberg',
    slug: 'movies-by-steven-spielberg',
    type: 'director',
    description: 'The master of adventure, wonder, and emotional storytelling.',
    source: 'tmdb',
    discover: { with_crew: 488, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Martin Scorsese',
    slug: 'movies-by-martin-scorsese',
    type: 'director',
    description: 'Crime, guilt, and the American dream through Scorsese\'s lens.',
    source: 'tmdb',
    discover: { with_crew: 1032, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Denis Villeneuve',
    slug: 'movies-by-denis-villeneuve',
    type: 'director',
    description: 'Slow-burn sci-fi and psychological thrillers of stunning scope.',
    source: 'tmdb',
    discover: { with_crew: 137427, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Ridley Scott',
    slug: 'movies-by-ridley-scott',
    type: 'director',
    description: 'Epic world-building from Alien to Gladiator to Napoleon.',
    source: 'tmdb',
    discover: { with_crew: 578, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Wes Anderson',
    slug: 'movies-by-wes-anderson',
    type: 'director',
    description: 'Symmetrical frames, pastel palettes, and deadpan wit.',
    source: 'tmdb',
    discover: { with_crew: 5655, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'David Fincher',
    slug: 'movies-by-david-fincher',
    type: 'director',
    description: 'Dark, meticulous thrillers with an obsessive eye for detail.',
    source: 'tmdb',
    discover: { with_crew: 7467, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Greta Gerwig',
    slug: 'movies-by-greta-gerwig',
    type: 'director',
    description: 'Intimate, witty films about womanhood, ambition, and identity.',
    source: 'tmdb',
    discover: { with_crew: 45400, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },
  {
    title: 'Hayao Miyazaki',
    slug: 'movies-by-hayao-miyazaki',
    type: 'director',
    description: 'Hand-drawn worlds of wonder from Japan\'s greatest animation master.',
    source: 'tmdb',
    discover: { with_crew: 608, sort_by: 'vote_average.desc', vote_count_gte: 50 },
  },

  // ── Actors — TMDB Discover by cast person ID ─────────────────────────────
  {
    title: 'Leonardo DiCaprio',
    slug: 'movies-with-leonardo-dicaprio',
    type: 'actor',
    description: 'Acclaimed performances across three decades of Hollywood.',
    source: 'tmdb',
    discover: { with_cast: 6193, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Tom Hanks',
    slug: 'movies-with-tom-hanks',
    type: 'actor',
    description: 'America\'s everyman in his most beloved roles.',
    source: 'tmdb',
    discover: { with_cast: 31, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Robert De Niro',
    slug: 'movies-with-robert-de-niro',
    type: 'actor',
    description: 'The master of method acting, from Taxi Driver to The Irishman.',
    source: 'tmdb',
    discover: { with_cast: 380, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Scarlett Johansson',
    slug: 'movies-with-scarlett-johansson',
    type: 'actor',
    description: 'Action hero, dramatic lead, and one of Hollywood\'s most versatile stars.',
    source: 'tmdb',
    discover: { with_cast: 1245, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Brad Pitt',
    slug: 'movies-with-brad-pitt',
    type: 'actor',
    description: 'From Fight Club to Babylon — a career of bold choices.',
    source: 'tmdb',
    discover: { with_cast: 287, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Meryl Streep',
    slug: 'movies-with-meryl-streep',
    type: 'actor',
    description: 'The most Oscar-nominated actor in history.',
    source: 'tmdb',
    discover: { with_cast: 5064, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Christian Bale',
    slug: 'movies-with-christian-bale',
    type: 'actor',
    description: 'Total physical transformations and intense dramatic performances.',
    source: 'tmdb',
    discover: { with_cast: 3894, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Keanu Reeves',
    slug: 'movies-with-keanu-reeves',
    type: 'actor',
    description: 'The internet\'s favourite action star — John Wick to The Matrix.',
    source: 'tmdb',
    discover: { with_cast: 6384, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Emma Stone',
    slug: 'movies-with-emma-stone',
    type: 'actor',
    description: 'Oscar-winning charm across comedy, drama, and musical.',
    source: 'tmdb',
    discover: { with_cast: 54693, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Ryan Gosling',
    slug: 'movies-with-ryan-gosling',
    type: 'actor',
    description: 'Deadpan leading man with serious dramatic range.',
    source: 'tmdb',
    discover: { with_cast: 30614, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },

  // ── Genres ───────────────────────────────────────────────────────────────
  {
    title: 'Best Science Fiction Movies',
    slug: 'best-science-fiction-movies',
    type: 'genre',
    description: 'Highly rated science fiction movies.',
    source: 'tmdb',
    discover: { with_genres: 878, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best Horror Movies',
    slug: 'best-horror-movies',
    type: 'genre',
    description: 'Highly rated horror movies.',
    source: 'tmdb',
    discover: { with_genres: 27, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best Romance Movies',
    slug: 'best-romance-movies',
    type: 'genre',
    description: 'Highly rated romance movies.',
    source: 'tmdb',
    discover: { with_genres: 10749, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best Action Movies',
    slug: 'best-action-movies',
    type: 'genre',
    description: 'Highly rated action movies.',
    source: 'tmdb',
    discover: { with_genres: 28, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best Comedy Movies',
    slug: 'best-comedy-movies',
    type: 'genre',
    description: 'Highly rated comedy movies.',
    source: 'tmdb',
    discover: { with_genres: 35, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best Adventure Movies',
    slug: 'best-adventure-movies',
    type: 'genre',
    description: 'Highly rated adventure movies.',
    source: 'tmdb',
    discover: { with_genres: 12, sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Best War Movies',
    slug: 'best-war-movies',
    type: 'genre',
    description: 'Highly rated war movies.',
    source: 'tmdb',
    discover: { with_genres: 10752, sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Best Western Movies',
    slug: 'best-western-movies',
    type: 'genre',
    description: 'Highly rated western movies.',
    source: 'tmdb',
    discover: { with_genres: 37, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Documentary Movies',
    slug: 'best-documentary-movies',
    type: 'genre',
    description: 'Highly rated documentary movies.',
    source: 'tmdb',
    discover: { with_genres: 99, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Animation Movies',
    slug: 'best-animation-movies',
    type: 'genre',
    description: 'Highly rated animation movies.',
    source: 'tmdb',
    discover: { with_genres: 16, sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },

  // ── TV Shows ─────────────────────────────────────────────────────────────
  {
    title: 'Best Sitcoms Ever',
    slug: 'best-sitcoms-ever',
    type: 'tv',
    description: 'The greatest sitcoms of all time.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 35, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best HBO Shows',
    slug: 'best-hbo-shows',
    type: 'tv',
    description: 'Premium drama and genre television from HBO.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_networks: 49, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Best Netflix Originals',
    slug: 'best-netflix-originals',
    type: 'tv',
    description: 'Original series produced by Netflix.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_networks: 213, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Best Mini-Series',
    slug: 'best-mini-series',
    type: 'tv',
    description: 'Compelling limited series with complete stories.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_type: 2, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Best Crime TV Shows',
    slug: 'best-crime-tv-shows',
    type: 'tv',
    description: 'Gripping crime dramas and thrillers.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 80, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Sci-Fi TV Shows',
    slug: 'best-scifi-tv-shows',
    type: 'tv',
    description: 'The best science fiction on television.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 10765, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Fantasy TV Shows',
    slug: 'best-fantasy-tv-shows',
    type: 'tv',
    description: 'Epic fantasy worlds brought to life on screen.',
    source: 'tmdb',
    // Sci-Fi & Fantasy genre + Drama to bias toward fantasy-leaning shows
    discover: { media_type: 'tv', with_genres: '10765,18', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Animated TV Shows',
    slug: 'best-animated-tv-shows',
    type: 'tv',
    description: 'Top-rated animated series for all ages.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 16, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Mystery Shows',
    slug: 'best-mystery-shows',
    type: 'tv',
    description: 'Suspenseful mystery and detective shows.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 9648, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },
  {
    title: 'Best Teen TV Shows',
    slug: 'best-teen-tv-shows',
    type: 'tv',
    description: 'Coming-of-age stories and youth drama.',
    source: 'tmdb',
    discover: { media_type: 'tv', with_genres: 10762, sort_by: 'vote_average.desc', vote_count_gte: 100 },
  },

  // ── Decades ───────────────────────────────────────────────────────────────
  {
    title: 'Best Movies of the 1960s',
    slug: 'best-movies-of-the-1960s',
    type: 'decade',
    description: 'Top movies released in the 1960s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '1960-01-01',
      'primary_release_date.lte': '1969-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 100,
    },
  },
  {
    title: 'Best Movies of the 1970s',
    slug: 'best-movies-of-the-1970s',
    type: 'decade',
    description: 'Top movies released in the 1970s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '1970-01-01',
      'primary_release_date.lte': '1979-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 150,
    },
  },
  {
    title: 'Best Movies of the 1980s',
    slug: 'best-movies-of-the-1980s',
    type: 'decade',
    description: 'Top movies released in the 1980s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '1980-01-01',
      'primary_release_date.lte': '1989-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 200,
    },
  },
  {
    title: 'Best Movies of the 1990s',
    slug: 'best-movies-of-the-1990s',
    type: 'decade',
    description: 'Top movies released in the 1990s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '1990-01-01',
      'primary_release_date.lte': '1999-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 300,
    },
  },
  {
    title: 'Best Movies of the 2000s',
    slug: 'best-movies-of-the-2000s',
    type: 'decade',
    description: 'Top movies released in the 2000s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2009-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 400,
    },
  },
  {
    title: 'Best Movies of the 2010s',
    slug: 'best-movies-of-the-2010s',
    type: 'decade',
    description: 'Top movies released in the 2010s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '2010-01-01',
      'primary_release_date.lte': '2019-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 500,
    },
  },
  {
    title: 'Best Movies of the 2020s',
    slug: 'best-movies-of-the-2020s',
    type: 'decade',
    description: 'Top movies released in the 2020s.',
    source: 'tmdb',
    discover: {
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2029-12-31',
      sort_by: 'vote_average.desc',
      vote_count_gte: 300,
    },
  },

  // ── Mood ──────────────────────────────────────────────────────────────────
  {
    title: 'Perfect Date Night Movies',
    slug: 'perfect-date-night-movies',
    type: 'mood',
    description: 'Romantic picks for a perfect evening in.',
    source: 'tmdb',
    // Romance OR Comedy
    discover: { with_genres: '10749|35', sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Girls Night Movies',
    slug: 'girls-night-movies',
    type: 'mood',
    description: 'Fun, fierce, and fabulous films for a girls night.',
    source: 'tmdb',
    discover: { with_genres: '35|10749', sort_by: 'popularity.desc', vote_count_gte: 500 },
  },
  {
    title: 'Movies to Watch with Friends',
    slug: 'movies-to-watch-with-friends',
    type: 'mood',
    description: 'Crowd-pleasing movies everyone will enjoy.',
    source: 'tmdb',
    discover: { with_genres: '28|35|12', sort_by: 'popularity.desc', vote_count_gte: 1000 },
  },
  {
    title: 'Movies That Will Make You Cry',
    slug: 'movies-that-will-make-you-cry',
    type: 'mood',
    description: 'Emotional films that will move you deeply.',
    source: 'tmdb',
    // Drama AND Romance
    discover: { with_genres: '18,10749', sort_by: 'vote_average.desc', vote_count_gte: 500 },
  },
  {
    title: 'Feel-Good Movies',
    slug: 'feelgood-movies',
    type: 'mood',
    description: 'Uplifting films guaranteed to brighten your day.',
    source: 'tmdb',
    discover: { with_genres: '35|16|10751', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Cozy Sunday Movies',
    slug: 'cozy-sunday-movies',
    type: 'mood',
    description: 'Warm, easy-going films for a lazy weekend.',
    source: 'tmdb',
    discover: { with_genres: '35|10751|18', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Rainy Day Movies',
    slug: 'rainy-day-movies',
    type: 'mood',
    description: 'Absorbing films perfect for a grey, quiet day.',
    source: 'tmdb',
    discover: { with_genres: '18|53|9648', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Late Night Movies',
    slug: 'late-night-movies',
    type: 'mood',
    description: 'Gripping, atmospheric films for after dark.',
    source: 'tmdb',
    discover: { with_genres: '27|53', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Mind-Bending Movies',
    slug: 'mindbending-movies',
    type: 'mood',
    description: 'Films that twist your perception of reality.',
    source: 'tmdb',
    discover: { with_genres: '878|53', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Comfort Movies',
    slug: 'comfort-movies',
    type: 'mood',
    description: 'Safe, familiar films that feel like a warm hug.',
    source: 'tmdb',
    discover: { with_genres: '35|10751|16', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },

  // ── Awards ────────────────────────────────────────────────────────────────
  {
    title: 'Oscar Best Picture Winners',
    slug: 'oscar-best-picture-winners',
    type: 'awards',
    description: 'Academy Award Best Picture winners — the cream of Hollywood drama.',
    source: 'tmdb',
    discover: { with_genres: 18, sort_by: 'vote_average.desc', vote_count_gte: 50000, vote_average_gte: 7.5 },
  },
  {
    title: 'Oscar Best Animated Feature',
    slug: 'oscar-best-animated-feature-winners',
    type: 'awards',
    description: 'Academy Award Best Animated Feature winners.',
    source: 'tmdb',
    discover: { with_genres: 16, sort_by: 'vote_average.desc', vote_count_gte: 20000, vote_average_gte: 7.0 },
  },
  {
    title: "Cannes Palme d'Or Winners",
    slug: 'cannes-palme-dor-winners',
    type: 'awards',
    description: "Films that won the Palme d'Or at Cannes.",
    source: 'tmdb',
    discover: { with_genres: 18, sort_by: 'vote_average.desc', vote_count_gte: 20000, vote_average_gte: 7.5 },
  },
  {
    title: 'Golden Globe Best Drama',
    slug: 'golden-globe-best-drama-winners',
    type: 'awards',
    description: 'Golden Globe Award Best Drama Film winners.',
    source: 'tmdb',
    discover: { with_genres: 18, sort_by: 'vote_average.desc', vote_count_gte: 30000, vote_average_gte: 7.5 },
  },
  {
    title: 'BAFTA Best Film Winners',
    slug: 'bafta-best-film-winners',
    type: 'awards',
    description: 'BAFTA Award for Best Film winners.',
    source: 'tmdb',
    discover: { with_genres: 18, sort_by: 'vote_average.desc', vote_count_gte: 30000, vote_average_gte: 7.5 },
  },

  // ── Themes ────────────────────────────────────────────────────────────────
  {
    title: 'Best Time Travel Movies',
    slug: 'best-time-travel-movies',
    type: 'theme',
    description: 'Movies centered around time travel.',
    source: 'tmdb',
    discover: { with_genres: '878|53', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Space Movies',
    slug: 'best-space-movies',
    type: 'theme',
    description: 'Epic adventures set in the cosmos.',
    source: 'tmdb',
    discover: { with_genres: '878|12', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best AI Movies',
    slug: 'best-ai-movies',
    type: 'theme',
    description: 'Films exploring artificial intelligence and technology.',
    source: 'tmdb',
    discover: { with_genres: 878, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Hacker Movies',
    slug: 'best-hacker-movies',
    type: 'theme',
    description: 'Cyber-thriller films about hackers and tech.',
    source: 'tmdb',
    discover: { with_genres: '53|80', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Heist Movies',
    slug: 'best-heist-movies',
    type: 'theme',
    description: 'Slick, clever heist films.',
    source: 'tmdb',
    discover: { with_genres: '80|53', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Best Zombie Movies',
    slug: 'best-zombie-movies',
    type: 'theme',
    description: 'The undead rise in these horror films.',
    source: 'tmdb',
    discover: { with_genres: 27, sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Vampire Movies',
    slug: 'best-vampire-movies',
    type: 'theme',
    description: 'Films featuring the iconic vampire mythos.',
    source: 'tmdb',
    discover: { with_genres: '27|14', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Best Dystopian Movies',
    slug: 'best-dystopian-movies',
    type: 'theme',
    description: 'Dark visions of a bleak future.',
    source: 'tmdb',
    discover: { with_genres: '878|18', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },
  {
    title: 'Best Cyberpunk Movies',
    slug: 'best-cyberpunk-movies',
    type: 'theme',
    description: 'High-tech, low-life cyberpunk cinema.',
    source: 'tmdb',
    discover: { with_genres: '878|28', sort_by: 'vote_average.desc', vote_count_gte: 200 },
  },
  {
    title: 'Based on True Stories',
    slug: 'best-movies-based-on-true-stories',
    type: 'theme',
    description: 'Compelling films inspired by real events.',
    source: 'tmdb',
    discover: { with_genres: '18|36', sort_by: 'vote_average.desc', vote_count_gte: 300 },
  },

  // ── Classics ──────────────────────────────────────────────────────────────
  {
    title: 'Cult Classic Movies',
    slug: 'cult-classic-movies',
    type: 'classics',
    description: 'Films with devoted cult followings.',
    source: 'tmdb',
    discover: { sort_by: 'vote_average.desc', vote_count_gte: 5000, vote_average_gte: 7.5 },
  },
  {
    title: 'Must-Watch Movie Classics',
    slug: 'mustwatch-movie-classics',
    type: 'classics',
    description: 'Essential films every cinephile should see.',
    source: 'tmdb',
    discover: { sort_by: 'vote_average.desc', vote_count_gte: 50000, vote_average_gte: 8.0 },
  },
  {
    title: 'Movies Everyone Should See Once',
    slug: 'movies-everyone-should-see-once',
    type: 'classics',
    description: 'Culturally defining films that shaped cinema.',
    source: 'tmdb',
    discover: { sort_by: 'vote_average.desc', vote_count_gte: 100000, vote_average_gte: 8.0 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find(c => c.slug === slug);
}

/** Collections grouped by type for the browse UI. */
export function getCollectionsByType(): Record<CollectionType, Collection[]> {
  return COLLECTIONS.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<CollectionType, Collection[]>);
}

/** The first N editorial collections available to free signed-in users. */
export function getFreeEditorialSlugs(): Set<string> {
  return new Set(
    COLLECTIONS.filter(c => c.source === 'editorial')
      .slice(0, FREE_COLLECTIONS_LIMIT)
      .map(c => c.slug)
  );
}
