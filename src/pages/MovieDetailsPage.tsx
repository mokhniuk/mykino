import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, BookmarkPlus, BookmarkCheck, Star, Clock, CheckCircle2, Heart, Globe, ChevronDown,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getMovieDetails, getWatchProviders, detectCountry, PROVIDER_LOGO_BASE, type WatchProviderResult } from '@/lib/api';
import {
  isInWatchlist, addToWatchlist,
  isWatched, addToWatched, removeFromWatched, removeFromWatchlist,
  isInFavourites, addToFavourites, removeFromFavourites,
  type MovieData,
} from '@/lib/db';

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watched, setWatched] = useState(false);
  const [inFavourites, setInFavourites] = useState(false);
  const [watchProvidersAll, setWatchProvidersAll] = useState<Record<string, WatchProviderResult> | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showMoreProviders, setShowMoreProviders] = useState(false);

  // Detect/restore country once
  useEffect(() => {
    const saved = localStorage.getItem('preferredCountry');
    if (saved) {
      setSelectedCountry(saved);
    } else {
      detectCountry().then(code => setSelectedCountry(code));
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setWatchProvidersAll(null);
    setShowMoreProviders(false);
    Promise.all([
      getMovieDetails(id, lang),
      isInWatchlist(id),
      isWatched(id),
      isInFavourites(id),
    ]).then(([data, wl, wd, fv]) => {
      setMovie(data);
      setInWatchlist(wl);
      setWatched(wd);
      setInFavourites(fv);
      setLoading(false);
      if (data) {
        getWatchProviders(id, data.Type).then(setWatchProvidersAll);
      }
    });
  }, [id, lang]);

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setShowCountryPicker(false);
    localStorage.setItem('preferredCountry', code);
  };

  const countryName = (code: string) => {
    try {
      return new Intl.DisplayNames([lang === 'ua' ? 'uk' : 'en'], { type: 'region' }).of(code) ?? code;
    } catch {
      return code;
    }
  };

  const providerSearchUrl = (providerName: string, title: string): string | null => {
    const n = providerName.toLowerCase();
    const q = encodeURIComponent(title);
    if (n.includes('netflix')) return `https://www.netflix.com/search?q=${q}`;
    if (n.includes('disney')) return `https://www.disneyplus.com/search/${q}`;
    if (n.includes('prime') || n.includes('amazon')) return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
    if (n.includes('apple')) return `https://tv.apple.com/search?term=${q}`;
    if (n.includes('hulu')) return `https://www.hulu.com/search?q=${q}`;
    if (n.includes('max') || n.includes('hbo')) return `https://www.max.com/search?q=${q}`;
    if (n.includes('paramount')) return `https://www.paramountplus.com/search/${q}/`;
    if (n.includes('peacock')) return `https://www.peacocktv.com/search?q=${q}`;
    if (n.includes('mubi')) return `https://mubi.com/en/search?q=${q}`;
    if (n.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${q}`;
    return null;
  };

  const handleAddToWatchlist = async () => {
    if (!movie) return;
    await addToWatchlist(movie);
    setInWatchlist(true);
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  const toggleFavourite = async () => {
    if (!movie) return;
    if (inFavourites) { await removeFromFavourites(movie.imdbID); setInFavourites(false); }
    else { await addToFavourites(movie); setInFavourites(true); }
  };

  const handleMarkWatched = async () => {
    if (!movie) return;
    await addToWatched(movie);
    await removeFromWatchlist(movie.imdbID);
    setWatched(true);
    setInWatchlist(false);
    queryClient.invalidateQueries({ queryKey: ['watched'] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  const handleUnwatch = async () => {
    if (!movie) return;
    await removeFromWatched(movie.imdbID);
    await addToWatchlist(movie);
    setWatched(false);
    setInWatchlist(true);
    queryClient.invalidateQueries({ queryKey: ['watched'] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="px-4 pt-8 text-center text-muted-foreground">
        Movie not found
      </div>
    );
  }

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;

  const infoItems = [
    { label: t('director'), value: movie.Director },
    { label: t('writer'), value: movie.Writer },
    { label: t('actors'), value: movie.Actors },
    { label: t('genre'), value: movie.Genre },
    { label: t('rated'), value: movie.Rated },
    { label: t('language'), value: movie.Language },
    { label: t('country'), value: movie.Country },
    { label: t('awards'), value: movie.Awards },
    { label: t('boxOffice'), value: movie.BoxOffice },
  ].filter((i) => i.value && i.value !== 'N/A');

  return (
    <div className="animate-fade-in">
      {/* Hero background — full bleed */}
      {poster && (
        <div className="h-64 md:h-80 overflow-hidden relative">
          <img
            src={poster}
            alt={movie.Title}
            className="w-full h-full object-cover blur-sm scale-110 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background pointer-events-none" />
        </div>
      )}

      {/* Header overlay — same container as body content */}
      <div className={poster ? '-mt-64 md:-mt-80 relative' : ''}>
        <div className="px-4 md:px-6">
          <div className="max-w-4xl mx-auto">

            {/* Back button + favourites */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full glass text-foreground hover:bg-secondary transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onClick={toggleFavourite}
                className={`p-2 rounded-full glass transition-colors ${inFavourites ? 'text-destructive' : 'text-foreground hover:bg-secondary'
                  }`}
              >
                <Heart size={24} fill={inFavourites ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Spacer — pushes title to the bottom of the hero area */}
            {poster && <div className="h-20 md:h-20" />}

            {/* Poster thumbnail + title */}
            <div className="flex gap-4 items-start">
              {poster && (
                <img
                  src={poster}
                  alt={movie.Title}
                  className="w-24 md:w-32 rounded-xl shadow-lg -mb-6 flex-shrink-0"
                  loading="eager"
                />
              )}
              <div className={`min-w-0 ${poster ? 'pb-2' : 'pt-6'}`}>
                <h1 className="text-2xl md:text-3xl text-foreground leading-tight">{movie.Title}</h1>
                <div className="flex flex-col items-start gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <p className="mb-2 flex items-center gap-3">
                    {movie.Year && <span >{movie.Year}</span>}
                    {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                      <span className="flex items-center gap-1 text-primary">
                        <Star size={12} fill="currentColor" /> {movie.imdbRating}
                      </span>
                    )}
                  </p>
                  {movie.Runtime && movie.Runtime !== 'N/A' && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {movie.Runtime}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Body content — same container */}
      <div className="px-4 md:px-6">
        <div className="max-w-4xl mx-auto mt-10 md:mt-8 pb-8">

          {/* Actions */}
          <div className="mb-6 relative h-[42px] w-full">
            {/* Action Buttons (shown when not watched) */}
            <div className={`flex gap-3 w-full transition-all duration-500 ${watched ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
              <button
                onClick={inWatchlist ? () => removeFromWatchlist(movie.imdbID).then(() => { setInWatchlist(false); queryClient.invalidateQueries({ queryKey: ['watchlist'] }); }) : handleAddToWatchlist}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden whitespace-nowrap ${inWatchlist
                  ? 'w-[42px] bg-secondary text-primary'
                  : 'flex-1 bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                title={inWatchlist ? t('removeFromWatchlist') : t('addToWatchlist')}
              >
                {inWatchlist ? <BookmarkCheck size={24} className="flex-shrink-0" /> : <BookmarkPlus size={24} className="flex-shrink-0" />}
                {!inWatchlist && <span className="transition-opacity duration-200">{t('addToWatchlist')}</span>}
              </button>

              <button
                onClick={handleMarkWatched}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden whitespace-nowrap ${inWatchlist
                  ? 'flex-1 bg-primary text-primary-foreground hover:opacity-90'
                  : 'w-[42px] bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                title={t('markAsWatched')}
              >
                <CheckCircle2 size={24} className="flex-shrink-0" />
                {inWatchlist && <span className="transition-opacity duration-200">{t('markAsWatched')}</span>}
              </button>
            </div>

            {/* Watched Status (shown when watched) */}
            <div className={`absolute inset-0 transition-all duration-500 ${watched ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
              <button
                onClick={handleUnwatch}
                className="w-full h-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-colors"
              >
                <CheckCircle2 size={24} className="text-primary" />
                {t('watchedSection')}
              </button>
            </div>
          </div>

          {/* Plot */}
          {movie.Plot && movie.Plot !== 'N/A' && (
            <section className="mb-6">
              <h2 className="text-lg text-foreground mb-2">{t('plot')}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{movie.Plot}</p>
            </section>
          )}

          {/* Trailer */}
          {movie.TrailerKey && (
            <section className="mb-6">
              <h2 className="text-lg text-foreground mb-2">{t('trailer') ?? 'Trailer'}</h2>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-secondary/30">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.TrailerKey}`}
                  title={`${movie.Title} Trailer`}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Ratings */}
          {(movie.imdbRating || movie.Metascore) && (
            <div className="flex gap-3 mb-6">
              {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                <div className="p-4 rounded-xl bg-secondary/50 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground mb-1">{t('imdbRating')}</p>
                  <p className="text-2xl font-bold text-primary">{movie.imdbRating}</p>
                  {movie.imdbVotes && <p className="text-xs text-muted-foreground mt-0.5">{movie.imdbVotes} votes</p>}
                </div>
              )}
              {movie.Metascore && movie.Metascore !== 'N/A' && (
                <div className="p-4 rounded-xl bg-secondary/50 text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground mb-1">{t('metascore')}</p>
                  <p className="text-2xl font-bold text-foreground">{movie.Metascore}</p>
                </div>
              )}
            </div>
          )}

          {/* Where to Watch */}
          {watchProvidersAll !== null && selectedCountry && (() => {
            const providers = watchProvidersAll[selectedCountry];
            const availableCountries = Object.keys(watchProvidersAll).sort((a, b) =>
              countryName(a).localeCompare(countryName(b))
            );
            const hasProviders = providers && (providers.flatrate || providers.rent || providers.buy);
            return (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg text-foreground">{t('whereToWatch')}</h2>
                  <div className="relative">
                    <button
                      onClick={() => setShowCountryPicker(v => !v)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                    >
                      <Globe size={13} />
                      <span>{countryName(selectedCountry)}</span>
                      <ChevronDown size={13} className={`transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showCountryPicker && (
                      <div className="absolute right-0 top-full mt-1 z-10 w-52 max-h-60 overflow-y-auto rounded-xl bg-popover border border-border shadow-lg">
                        {availableCountries.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
                        ) : (
                          availableCountries.map(code => (
                            <button
                              key={code}
                              onClick={() => handleCountryChange(code)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${code === selectedCountry ? 'text-primary font-medium' : 'text-foreground'}`}
                            >
                              {countryName(code)}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {showCountryPicker && (
                  <div className="fixed inset-0 z-[9]" onClick={() => setShowCountryPicker(false)} />
                )}

                <div className="p-4 rounded-xl bg-secondary/50">
                  {hasProviders ? (() => {
                    const searchTitle = movie.OriginalTitle ?? movie.Title;
                    const renderProviders = (list: typeof providers.flatrate) => (
                      <div className="flex flex-wrap gap-3">
                        {list!.map(p => {
                          const url = providerSearchUrl(p.provider_name, searchTitle);
                          const inner = (
                            <>
                              <img src={`${PROVIDER_LOGO_BASE}${p.logo_path}`} alt={p.provider_name} className="w-10 h-10 rounded-xl transition-opacity group-hover:opacity-75" />
                              <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">{p.provider_name}</span>
                            </>
                          );
                          return url ? (
                            <a key={p.provider_id} href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group w-12">
                              {inner}
                            </a>
                          ) : (
                            <div key={p.provider_id} className="flex flex-col items-center gap-1 w-12">
                              {inner}
                            </div>
                          );
                        })}
                      </div>
                    );
                    const hasRentOrBuy = !!(providers.rent || providers.buy);
                    const expandRentBuy = !providers.flatrate || showMoreProviders;
                    return (
                      <div className="space-y-4">
                        {providers.flatrate && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">{t('stream')}</p>
                            {renderProviders(providers.flatrate)}
                          </div>
                        )}
                        {expandRentBuy && (
                          <>
                            {providers.rent && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">{t('rent')}</p>
                                {renderProviders(providers.rent)}
                              </div>
                            )}
                            {providers.buy && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">{t('buy')}</p>
                                {renderProviders(providers.buy)}
                              </div>
                            )}
                          </>
                        )}
                        {providers.flatrate && hasRentOrBuy && (
                          <button
                            onClick={() => setShowMoreProviders(v => !v)}
                            className="text-xs text-primary hover:underline"
                          >
                            {showMoreProviders ? t('showLess') : t('more')}
                          </button>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="text-sm text-muted-foreground">
                      <p>{t('notAvailableInCountry')} {countryName(selectedCountry)}.</p>
                      {availableCountries.length > 0 && (
                        <button
                          onClick={() => setShowCountryPicker(true)}
                          className="mt-1 text-primary hover:underline"
                        >
                          {t('notInCountry')} {countryName(selectedCountry)}?
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoItems.map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-sm text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
