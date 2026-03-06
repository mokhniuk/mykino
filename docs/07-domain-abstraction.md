# Domain Abstraction Strategy

This document explains how to abstract the domain model to support multiple media types (movies, books, music, games).

## Core Concept

Create a generic `MediaItem` interface that all media types extend. This allows:
- Reusable UI components (MediaCard instead of MovieCard)
- Reusable services (RecommendationService works for any media)
- Reusable storage (same repository for all media)
- Easy addition of new media types

## Domain Models

### Base Media Item

```typescript
// domain/models/MediaItem.ts
export interface MediaItem {
  id: string;                    // Unified ID format
  type: MediaType;               // Discriminator
  title: string;
  originalTitle?: string;
  year: string;
  poster?: string;
  plot?: string;
  rating?: number;
  genres: string[];
  metadata: Record<string, any>; // Type-specific metadata
  addedAt?: number;              // For collections
}

export type MediaType = 'movie' | 'tv' | 'book' | 'music' | 'game';
```

### Movie

```typescript
// domain/models/Movie.ts
export interface Movie extends MediaItem {
  type: 'movie';
  metadata: MovieMetadata;
}

export interface MovieMetadata {
  director?: string;
  actors?: string[];
  writer?: string;
  runtime?: number;
  released?: string;
  language?: string;
  country?: string;
  boxOffice?: string;
  trailerKey?: string;
  imdbRating?: string;
  imdbVotes?: string;
}
```

### TV Series

```typescript
// domain/models/TVSeries.ts
export interface TVSeries extends MediaItem {
  type: 'tv';
  metadata: TVMetadata;
}

export interface TVMetadata {
  creator?: string;
  actors?: string[];
  seasons: number;
  episodes: number;
  status: 'ongoing' | 'ended';
  runtime?: number;
  language?: string;
  country?: string;
  trailerKey?: string;
}

export interface TVTracking {
  seriesId: string;
  status: 'watching' | 'completed' | 'planned';
  seasons: Record<number, {
    watchedEpisodes: number[];
  }>;
  totalEpisodesWatched: number;
  numberOfEpisodes?: number;
  lastWatchedAt: number;
}
```

### Book (Future)

```typescript
// domain/models/Book.ts
export interface Book extends MediaItem {
  type: 'book';
  metadata: BookMetadata;
}

export interface BookMetadata {
  author: string;
  isbn?: string;
  publisher?: string;
  pages?: number;
  language?: string;
  publicationDate?: string;
  series?: string;
  seriesNumber?: number;
}
```

### Music (Future)

```typescript
// domain/models/Music.ts
export interface Album extends MediaItem {
  type: 'music';
  metadata: AlbumMetadata;
}

export interface AlbumMetadata {
  artist: string;
  label?: string;
  releaseDate?: string;
  tracks?: number;
  duration?: number;
  genre?: string[];
}
```

### Game (Future)

```typescript
// domain/models/Game.ts
export interface Game extends MediaItem {
  type: 'game';
  metadata: GameMetadata;
}

export interface GameMetadata {
  developer: string;
  publisher?: string;
  platform: string[];
  releaseDate?: string;
  esrbRating?: string;
  multiplayer?: boolean;
}
```

---

## Collections

```typescript
// domain/models/Collection.ts
export interface Collection<T extends MediaItem> {
  id: string;
  name: string;
  type: CollectionType;
  items: T[];
  createdAt: number;
  updatedAt: number;
}

export type CollectionType = 'watchlist' | 'watched' | 'favorites' | 'custom';

// Predefined collections
export class Watchlist<T extends MediaItem> {
  constructor(private repository: ICollectionRepository<T>) {}
  
  async add(item: T): Promise<void> {
    await this.repository.add('watchlist', item);
  }
  
  async remove(id: string): Promise<void> {
    await this.repository.remove('watchlist', id);
  }
  
  async getAll(): Promise<T[]> {
    return this.repository.getAll('watchlist');
  }
}
```

---

## Taste Profile

```typescript
// domain/models/TasteProfile.ts
export interface TasteProfile {
  mediaType: MediaType;
  topGenres: string[];      // Top 5 genres
  topLanguages: string[];   // Top 3 languages
  topCountries: string[];   // Top 3 countries
  topDecades: string[];     // Top 2 decades
  topCreators: string[];    // Top directors/authors/artists
  builtAt: number;
  version: number;
}

// Type-specific profiles
export interface MovieTasteProfile extends TasteProfile {
  mediaType: 'movie';
  topDirectors: string[];
}

export interface BookTasteProfile extends TasteProfile {
  mediaType: 'book';
  topAuthors: string[];
}
```

---

## Provider Interface

```typescript
// providers/IMediaProvider.ts
export interface IMediaProvider<T extends MediaItem> {
  readonly mediaType: MediaType;
  
  search(query: string, page?: number): Promise<SearchResult<T>>;
  getDetails(id: string): Promise<T | null>;
  getRecommendations(id: string, page?: number): Promise<T[]>;
  getSimilar(id: string, page?: number): Promise<T[]>;
  getTrending(page?: number): Promise<T[]>;
  getPopular(page?: number): Promise<T[]>;
  discover(filters: DiscoverFilters): Promise<SearchResult<T>>;
}

export interface SearchResult<T> {
  items: T[];
  totalResults: number;
  page: number;
  totalPages: number;
}

export interface DiscoverFilters {
  genre?: string[];
  year?: string;
  country?: string;
  language?: string;
  rating?: { min?: number; max?: number };
  [key: string]: any; // Provider-specific filters
}
```

### TMDB Provider Implementation

```typescript
// providers/movies/TMDBProvider.ts
export class TMDBProvider implements IMediaProvider<Movie> {
  readonly mediaType = 'movie' as const;
  
  async search(query: string, page = 1): Promise<SearchResult<Movie>> {
    const data = await this.tmdbFetch(`/search/multi?query=${query}&page=${page}`);
    
    return {
      items: data.results
        .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        .map(this.mapToMovie),
      totalResults: data.total_results,
      page: data.page,
      totalPages: data.total_pages
    };
  }
  
  async getDetails(id: string): Promise<Movie | null> {
    const tmdbId = this.extractTmdbId(id);
    const isTV = id.startsWith('tv-');
    
    const endpoint = isTV ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const data = await this.tmdbFetch(`${endpoint}?append_to_response=credits,videos`);
    
    return isTV ? this.mapTVToMovie(data) : this.mapMovieDetail(data);
  }
  
  private mapToMovie(tmdbData: any): Movie {
    const isTV = tmdbData.media_type === 'tv';
    
    return {
      id: `${isTV ? 'tv-' : 'm-'}${tmdbData.id}`,
      type: isTV ? 'tv' : 'movie',
      title: isTV ? tmdbData.name : tmdbData.title,
      year: (isTV ? tmdbData.first_air_date : tmdbData.release_date)?.slice(0, 4) ?? '',
      poster: tmdbData.poster_path ? `${IMAGE_BASE}${tmdbData.poster_path}` : undefined,
      plot: tmdbData.overview,
      rating: tmdbData.vote_average,
      genres: tmdbData.genre_ids?.map(id => this.genreMap[id]) ?? [],
      metadata: isTV ? this.mapTVMetadata(tmdbData) : this.mapMovieMetadata(tmdbData)
    };
  }
}
```

### Open Library Provider (Future)

```typescript
// providers/books/OpenLibraryProvider.ts
export class OpenLibraryProvider implements IMediaProvider<Book> {
  readonly mediaType = 'book' as const;
  
  async search(query: string, page = 1): Promise<SearchResult<Book>> {
    const data = await this.olFetch(`/search.json?q=${query}&page=${page}`);
    
    return {
      items: data.docs.map(this.mapToBook),
      totalResults: data.numFound,
      page,
      totalPages: Math.ceil(data.numFound / 100)
    };
  }
  
  async getDetails(id: string): Promise<Book | null> {
    const data = await this.olFetch(`/works/${id}.json`);
    return this.mapBookDetail(data);
  }
  
  private mapToBook(olData: any): Book {
    return {
      id: `b-${olData.key.split('/').pop()}`,
      type: 'book',
      title: olData.title,
      year: olData.first_publish_year?.toString() ?? '',
      poster: olData.cover_i ? `https://covers.openlibrary.org/b/id/${olData.cover_i}-L.jpg` : undefined,
      plot: olData.first_sentence?.[0],
      rating: olData.ratings_average,
      genres: olData.subject?.slice(0, 5) ?? [],
      metadata: {
        author: olData.author_name?.[0] ?? 'Unknown',
        isbn: olData.isbn?.[0],
        publisher: olData.publisher?.[0],
        pages: olData.number_of_pages_median,
        language: olData.language?.[0]
      }
    };
  }
}
```

---

## Repository Pattern

```typescript
// domain/repositories/IMediaRepository.ts
export interface IMediaRepository<T extends MediaItem> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  add(item: T): Promise<void>;
  update(item: T): Promise<void>;
  remove(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// core/storage/Repository.ts
export class Repository<T extends { id: string }> implements IMediaRepository<T> {
  constructor(
    private adapter: StorageAdapter,
    private storeName: string
  ) {}
  
  async getAll(): Promise<T[]> {
    return this.adapter.getAll<T>(this.storeName);
  }
  
  async getById(id: string): Promise<T | null> {
    return this.adapter.get<T>(this.storeName, id);
  }
  
  async add(item: T): Promise<void> {
    await this.adapter.put(this.storeName, item);
  }
  
  async update(item: T): Promise<void> {
    await this.adapter.put(this.storeName, item);
  }
  
  async remove(id: string): Promise<void> {
    await this.adapter.delete(this.storeName, id);
  }
  
  async exists(id: string): Promise<boolean> {
    const item = await this.getById(id);
    return item !== null;
  }
  
  async clear(): Promise<void> {
    await this.adapter.clear(this.storeName);
  }
  
  async count(): Promise<number> {
    return this.adapter.count(this.storeName);
  }
}
```

---

## Service Layer

### Recommendation Service

```typescript
// domain/services/RecommendationService.ts
export class RecommendationService<T extends MediaItem> {
  constructor(
    private provider: IMediaProvider<T>,
    private tasteProfileService: TasteProfileService,
    private watchedRepo: IMediaRepository<T>,
    private watchlistRepo: IMediaRepository<T>
  ) {}
  
  async getPersonalizedRecommendations(): Promise<RecommendationSection<T>[]> {
    const [profile, watched, watchlist] = await Promise.all([
      this.tasteProfileService.getProfile(),
      this.watchedRepo.getAll(),
      this.watchlistRepo.getAll()
    ]);
    
    const excludeIds = new Set([
      ...watched.map(m => m.id),
      ...watchlist.map(m => m.id)
    ]);
    
    // Fetch from multiple sources
    const [trending, popular, similar] = await Promise.all([
      this.provider.getTrending(),
      this.provider.getPopular(),
      this.getSimilarToFavorites()
    ]);
    
    // Score and filter
    const sections: RecommendationSection<T>[] = [
      {
        id: 'trending',
        title: 'Trending',
        items: this.scoreAndFilter(trending, profile, excludeIds)
      },
      {
        id: 'popular',
        title: 'Popular',
        items: this.scoreAndFilter(popular, profile, excludeIds)
      },
      {
        id: 'similar',
        title: 'Because You Liked',
        items: this.scoreAndFilter(similar, profile, excludeIds)
      }
    ];
    
    return sections;
  }
  
  private scoreAndFilter(
    items: T[],
    profile: TasteProfile,
    excludeIds: Set<string>
  ): T[] {
    return items
      .filter(item => !excludeIds.has(item.id))
      .map(item => ({
        item,
        score: this.calculateScore(item, profile)
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 100);
  }
  
  private calculateScore(item: T, profile: TasteProfile): number {
    let score = 0;
    
    // Genre matching
    const matchingGenres = item.genres.filter(g => profile.topGenres.includes(g));
    score += matchingGenres.length * 3;
    
    // Rating boost
    if (item.rating && item.rating >= 7.0) score += 2;
    
    // Year/decade matching
    const decade = `${Math.floor(parseInt(item.year) / 10) * 10}s`;
    if (profile.topDecades.includes(decade)) score += 2;
    
    return score;
  }
}

export interface RecommendationSection<T extends MediaItem> {
  id: string;
  title: string;
  items: T[];
}
```

### Taste Profile Service

```typescript
// domain/services/TasteProfileService.ts
export class TasteProfileService {
  constructor(
    private watchedRepo: IMediaRepository<MediaItem>,
    private favoritesRepo: IMediaRepository<MediaItem>,
    private cacheManager: CacheManager<TasteProfile>
  ) {}
  
  async getProfile(): Promise<TasteProfile> {
    const cached = await this.cacheManager.get('taste_profile');
    if (cached) return cached;
    
    const profile = await this.buildProfile();
    await this.cacheManager.set('taste_profile', profile);
    return profile;
  }
  
  async invalidate(): Promise<void> {
    await this.cacheManager.clear('taste_profile');
  }
  
  private async buildProfile(): Promise<TasteProfile> {
    const [watched, favorites] = await Promise.all([
      this.watchedRepo.getAll(),
      this.favoritesRepo.getAll()
    ]);
    
    const genreScores = new Map<string, number>();
    const languageScores = new Map<string, number>();
    const countryScores = new Map<string, number>();
    const decadeScores = new Map<string, number>();
    
    // Tally with weights
    for (const item of favorites) {
      this.tallyItem(item, 3, genreScores, languageScores, countryScores, decadeScores);
    }
    
    for (const item of watched.slice(0, 100)) {
      this.tallyItem(item, 2, genreScores, languageScores, countryScores, decadeScores);
    }
    
    for (const item of watched.slice(100)) {
      this.tallyItem(item, 1, genreScores, languageScores, countryScores, decadeScores);
    }
    
    return {
      mediaType: watched[0]?.type ?? 'movie',
      topGenres: this.topN(genreScores, 5),
      topLanguages: this.topN(languageScores, 3),
      topCountries: this.topN(countryScores, 3),
      topDecades: this.topN(decadeScores, 2),
      topCreators: [], // TODO: Extract from metadata
      builtAt: Date.now(),
      version: 1
    };
  }
  
  private tallyItem(
    item: MediaItem,
    weight: number,
    genreScores: Map<string, number>,
    languageScores: Map<string, number>,
    countryScores: Map<string, number>,
    decadeScores: Map<string, number>
  ): void {
    // Tally genres
    for (const genre of item.genres) {
      genreScores.set(genre, (genreScores.get(genre) ?? 0) + weight);
    }
    
    // Tally language
    const language = item.metadata.language;
    if (language) {
      languageScores.set(language, (languageScores.get(language) ?? 0) + weight);
    }
    
    // Tally country
    const country = item.metadata.country;
    if (country) {
      countryScores.set(country, (countryScores.get(country) ?? 0) + weight);
    }
    
    // Tally decade
    const decade = `${Math.floor(parseInt(item.year) / 10) * 10}s`;
    decadeScores.set(decade, (decadeScores.get(decade) ?? 0) + weight);
  }
  
  private topN<T>(scores: Map<T, number>, n: number): T[] {
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);
  }
}
```

---

## UI Components

### Generic Media Card

```typescript
// ui/MediaCard.tsx
interface MediaCardProps<T extends MediaItem> {
  item: T;
  size?: 'sm' | 'md' | 'lg';
  onAction?: (action: string, item: T) => void;
}

export function MediaCard<T extends MediaItem>({ 
  item, 
  size = 'md',
  onAction 
}: MediaCardProps<T>) {
  return (
    <div className="media-card">
      <img src={item.poster} alt={item.title} />
      <h3>{item.title}</h3>
      <p>{item.year}</p>
      <div className="genres">
        {item.genres.map(g => <span key={g}>{g}</span>)}
      </div>
      {item.rating && <div className="rating">{item.rating}</div>}
      
      {/* Type-specific rendering */}
      {item.type === 'movie' && (
        <MovieMetadata metadata={item.metadata as MovieMetadata} />
      )}
      {item.type === 'book' && (
        <BookMetadata metadata={item.metadata as BookMetadata} />
      )}
    </div>
  );
}
```

---

## Benefits of This Approach

1. **Reusability:** Same components/services work for all media types
2. **Extensibility:** Easy to add new media types
3. **Type Safety:** TypeScript ensures correct usage
4. **Maintainability:** Changes in one place affect all media types
5. **Testability:** Easy to test with mock data
6. **Consistency:** Same UX across all media types

---

## Migration Path

1. Create `MediaItem` interface
2. Make `Movie` extend `MediaItem`
3. Update `TMDBProvider` to implement `IMediaProvider<Movie>`
4. Update repositories to use generic types
5. Update services to use generic types
6. Update UI components to use generic types
7. Add new media types (Book, Music, Game)
