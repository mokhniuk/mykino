import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { Search, CheckCircle2, Settings, Clapperboard, List } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { addToWatched, setContentPreferences, setSetting } from '@/lib/db';

const navItems = [
  { path: '/app/watchlist', icon: List, labelKey: 'watchlist' as const },
  { path: '/app/watched', icon: CheckCircle2, labelKey: 'watched' as const },
  { path: '/app', icon: Clapperboard, labelKey: 'home' as const },
  { path: '/app/search', icon: Search, labelKey: 'search' as const },
  { path: '/app/settings', icon: Settings, labelKey: 'settings' as const },
];

export default function Layout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;
    // Skip scroll-to-top only when going back from a movie details page
    if (navigationType === 'POP' && prev.startsWith('/app/movie/')) return;
    window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  // ── Setup handoff (IDB writes) ─────────────────────────────────────────────
  // main.tsx already applied lang/theme to localStorage before React mounted.
  // Here we finish the job: write genre preferences and watched movies to IDB.
  useEffect(() => {
    const raw = localStorage.getItem('_setup_handoff');
    if (!raw) return;
    localStorage.removeItem('_setup_handoff');
    (async () => {
      try {
        const p = JSON.parse(raw) as {
          l?: string; t?: string; lg?: number[]; dg?: number[];
          w?: { i: string; T: string; y: string; p: string; tp: string }[];
        };
        if (p.l) await setSetting('lang', p.l);
        if (p.t) await setSetting('theme', p.t);
        if (p.lg?.length || p.dg?.length) {
          await setContentPreferences({
            liked_genres: p.lg ?? [],
            disliked_genres: p.dg ?? [],
            liked_countries: [], disliked_countries: [],
            liked_languages: [], disliked_languages: [],
          });
        }
        if (p.w?.length) {
          await Promise.all(
            p.w.map(m =>
              addToWatched({
                imdbID: m.i,
                Title: m.T,
                Year: m.y,
                Poster: m.p,
                Type: m.tp,
              }),
            ),
          );
          // Invalidate the watched query so the director list, achievements,
          // and homepage all see the newly seeded movies immediately.
          queryClient.invalidateQueries({ queryKey: ['movies', 'watched'] });
        }
      } catch {
        /* malformed — ignore */
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const { pathname } = location;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar - desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 glass">
        <Link to="/app" className="flex items-center gap-2.5 font-display text-xl text-foreground group hidden">
          <img src="/icon-192.png" alt="MyKino" className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
          <span className='font-semibold'>MyKino</span>
        </Link>
        <nav className="flex items-center gap-1 m-auto">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                <item.icon size={18} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div />
      </header>

      {/* Content */}
      <main className="md:pt-16 pb-24 [@media(display-mode:standalone)]:pb-28 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom nav - mobile floating pill */}
      <nav className="md:hidden fixed bottom-3 [@media(display-mode:standalone)]:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="flex items-center justify-around px-2 py-3 rounded-3xl bg-card/70 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200"
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${active
                  ? 'bg-primary/15 text-primary scale-110'
                  : 'text-muted-foreground'
                  }`}>
                  <item.icon size={24} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`hidden text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
