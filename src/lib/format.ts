const DATE_LOCALE: Record<string, string> = {
  en: 'en-GB',
  ua: 'uk-UA',
  de: 'de-DE',
  cs: 'cs-CZ',
};

const RUNTIME_UNITS: Record<string, { h: string; min: string }> = {
  en: { h: 'h', min: 'min' },
  ua: { h: 'год', min: 'хв' },
  de: { h: 'h', min: 'Min.' },
  cs: { h: 'h', min: 'min' },
};

/** Formats a TMDB "YYYY-MM-DD" date string into a localized short date, e.g. "2 Mar 2026". */
export function formatDate(dateStr: string | undefined, lang: string): string {
  if (!dateStr) return '';
  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    if (!y || !mo || !d) return dateStr;
    const date = new Date(y, mo - 1, d);
    const locale = DATE_LOCALE[lang] ?? 'en-GB';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return dateStr;
  }
}

/** Formats a duration in minutes into a localized string, e.g. "29 min" or "2h 30 min". */
export function formatRuntime(minutes: number | undefined, lang: string): string {
  if (!minutes || minutes <= 0) return '';
  const u = RUNTIME_UNITS[lang] ?? RUNTIME_UNITS.en;
  if (minutes < 60) return `${minutes} ${u.min}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}${u.h}` : `${h}${u.h} ${m} ${u.min}`;
}

/** Parses a runtime string like "120 min" and formats it with the locale. */
export function formatRuntimeStr(runtimeStr: string | undefined, lang: string): string {
  if (!runtimeStr || runtimeStr === 'N/A') return '';
  const mins = parseInt(runtimeStr);
  if (isNaN(mins)) return runtimeStr;
  return formatRuntime(mins, lang);
}
