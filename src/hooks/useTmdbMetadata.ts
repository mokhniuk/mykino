import { useQuery } from '@tanstack/react-query';
import { getGenres, getCountries, getLanguages } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useMemo } from 'react';

export function useTmdbMetadata() {
    const { lang } = useI18n();

    const genresQuery = useQuery({
        queryKey: ['genres', lang],
        queryFn: () => getGenres(lang),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    const countriesQuery = useQuery({
        queryKey: ['countries', lang],
        queryFn: () => getCountries(lang),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    const languagesQuery = useQuery({
        queryKey: ['languages', lang],
        queryFn: () => getLanguages(lang),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // BCP 47 locale mapping
    const currentLocale = useMemo(() => {
        const localeMap: Record<string, string> = {
            en: 'en-US',
            ua: 'uk-UA',
            de: 'de-DE'
        };
        return localeMap[lang] || 'en-US';
    }, [lang]);

    const localizedCountries = useMemo(() => {
        if (!countriesQuery.data) return [];
        const countryNames = new Intl.DisplayNames([currentLocale], { type: 'region' });
        return countriesQuery.data.map(country => {
            try {
                const localizedName = countryNames.of(country.iso_3166_1);
                return {
                    id: country.iso_3166_1,
                    label: localizedName || country.english_name
                };
            } catch {
                return { id: country.iso_3166_1, label: country.english_name };
            }
        }).sort((a, b) => a.label.localeCompare(b.label, currentLocale));
    }, [countriesQuery.data, currentLocale]);

    const localizedLanguages = useMemo(() => {
        if (!languagesQuery.data) return [];
        const languageNames = new Intl.DisplayNames([currentLocale], { type: 'language' });
        return languagesQuery.data.map(language => {
            try {
                let localizedName = languageNames.of(language.iso_639_1);
                if (localizedName) {
                    localizedName = localizedName.charAt(0).toUpperCase() + localizedName.slice(1);
                }
                return {
                    id: language.iso_639_1,
                    label: localizedName || language.english_name
                };
            } catch {
                return { id: language.iso_639_1, label: language.english_name };
            }
        }).sort((a, b) => a.label.localeCompare(b.label, currentLocale));
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
