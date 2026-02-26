import { cacheMovie, getCachedMovie, type MovieData } from './db';
import { getSetting } from './db';

const BASE_URL = 'https://www.omdbapi.com/';

async function getApiKey(): Promise<string | null> {
  const key = await getSetting('omdb_api_key');
  return key || null;
}

export interface SearchResult {
  Search?: MovieData[];
  totalResults?: string;
  Response: string;
  Error?: string;
}

export async function searchMovies(query: string, page = 1): Promise<SearchResult> {
  const apiKey = await getApiKey();
  if (!apiKey) return { Response: 'False', Error: 'No API key configured' };

  const res = await fetch(`${BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(query)}&page=${page}`);
  const data: SearchResult = await res.json();

  if (data.Search) {
    for (const movie of data.Search) {
      const existing = await getCachedMovie(movie.imdbID);
      if (!existing) {
        await cacheMovie(movie);
      }
    }
  }

  return data;
}

export async function getMovieDetails(id: string): Promise<MovieData | null> {
  // Try cache first
  const cached = await getCachedMovie(id);
  if (cached && cached.Plot) {
    return cached;
  }

  const apiKey = await getApiKey();
  if (!apiKey) return cached || null;

  try {
    const res = await fetch(`${BASE_URL}?apikey=${apiKey}&i=${id}&plot=full`);
    const data = await res.json();

    if (data.Response === 'True') {
      await cacheMovie(data);
      return data;
    }
  } catch {
    // Return cached if available
  }

  return cached || null;
}
