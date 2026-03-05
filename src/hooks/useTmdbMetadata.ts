import { useQuery } from '@tanstack/react-query';
import { getGenres, getCountries, getLanguages } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useMemo, useEffect, useState } from 'react';
import { getMetadata, saveMetadata } from '@/lib/db';

export function useTmdbMetadata() {
    const { lang } = useI18n();
    const [cachedData, setCachedData] = useState<{
        genres: any,
        countries: any,
        languages: any
    }>({ genres: null, countries: null, languages: null });

    // Load from cache on mount (and lang change)
    useEffect(() => {
        const loadCache = async () => {
            const [g, c, l] = await Promise.all([
                getMetadata(`genres_${lang}`),
                getMetadata(`countries_${lang}`),
                getMetadata(`languages_${lang}`)
            ]);
            setCachedData({ genres: g, countries: c, languages: l });
        };
        loadCache();
    }, [lang]);

    const genresQuery = useQuery({
        queryKey: ['metadata', 'genres', lang],
        queryFn: async () => {
            const data = await getGenres(lang);
            await saveMetadata(`genres_${lang}`, data);
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        initialData: cachedData.genres || undefined,
    });

    const countriesQuery = useQuery({
        queryKey: ['metadata', 'countries', lang],
        queryFn: async () => {
            const data = await getCountries(lang);
            await saveMetadata(`countries_${lang}`, data);
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        initialData: cachedData.countries || undefined,
    });

    const languagesQuery = useQuery({
        queryKey: ['metadata', 'languages', lang],
        queryFn: async () => {
            const data = await getLanguages(lang);
            await saveMetadata(`languages_${lang}`, data);
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        initialData: cachedData.languages || undefined,
    });

    // BCP 47 locale mapping
    const currentLocale = useMemo(() => {
        const localeMap: Record<string, string> = {
            en: 'en-US',
            ua: 'uk-UA',
            de: 'de-DE',
            cs: 'cs-CZ',
        };
        return localeMap[lang] || 'en-US';
    }, [lang]);

    const localizedCountries = useMemo(() => {
        if (!countriesQuery.data) return [];
        // fallback:'none' returns undefined for unrecognised codes instead of the raw code
        const countryNames = new Intl.DisplayNames([currentLocale], { type: 'region', fallback: 'none' });
        const seenIds = new Set<string>();
        const seenLabels = new Set<string>();
        return countriesQuery.data
            .map(country => {
                try {
                    const localized = countryNames.of(country.iso_3166_1);
                    return { id: country.iso_3166_1, label: localized || country.english_name };
                } catch {
                    return { id: country.iso_3166_1, label: country.english_name };
                }
            })
            .filter(c => {
                // Deduplicate by id AND by label — deprecated codes (e.g. CS/RS → Serbia) share a display name
                if (seenIds.has(c.id)) return false;
                seenIds.add(c.id);
                const key = c.label.toLowerCase();
                if (seenLabels.has(key)) return false;
                seenLabels.add(key);
                return true;
            })
            .sort((a, b) => a.label.localeCompare(b.label, currentLocale));
    }, [countriesQuery.data, currentLocale]);

    const localizedLanguages = useMemo(() => {
        if (!languagesQuery.data) return [];
        // fallback:'none' → undefined for unknown codes, prevents raw codes like "mo"/"sh" leaking through
        const languageNames = new Intl.DisplayNames([currentLocale], { type: 'language', fallback: 'none' });
        const seenIds = new Set<string>();
        const seenLabels = new Set<string>();
        return languagesQuery.data
            .map(language => {
                try {
                    const localized = languageNames.of(language.iso_639_1);
                    const label = localized
                        ? localized.charAt(0).toUpperCase() + localized.slice(1)
                        : language.english_name;
                    return { id: language.iso_639_1, label };
                } catch {
                    return { id: language.iso_639_1, label: language.english_name };
                }
            })
            .filter(l => {
                // Drop anything that is still a raw ISO code abbreviation (2–3 lowercase letters)
                if (/^[a-z]{2,3}$/.test(l.label)) return false;
                // Deduplicate by id and label
                if (seenIds.has(l.id)) return false;
                seenIds.add(l.id);
                const key = l.label.toLowerCase();
                if (seenLabels.has(key)) return false;
                seenLabels.add(key);
                return true;
            })
            .sort((a, b) => a.label.localeCompare(b.label, currentLocale));
    }, [languagesQuery.data, currentLocale]);

    const localizedGenres = useMemo(() => {
        if (!genresQuery.data) return [];
        const all = [...genresQuery.data.movie, ...genresQuery.data.tv];
        const unique = all.reduce((acc, current) => {
            if (!acc.find(item => item.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, [] as { id: number, name: string }[]);

        return unique.map(g => ({ id: g.id, label: g.name }))
            .sort((a, b) => a.label.localeCompare(b.label, currentLocale));
    }, [genresQuery.data, currentLocale]);

    return {
        genres: localizedGenres,
        countries: localizedCountries,
        languages: localizedLanguages,
        isLoading: genresQuery.isLoading || countriesQuery.isLoading || languagesQuery.isLoading,
        isError: genresQuery.isError || countriesQuery.isError || languagesQuery.isError,
    };
}
