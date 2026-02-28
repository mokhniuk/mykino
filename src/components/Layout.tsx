import { useEffect } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { Home, Search, BookmarkPlus, CheckCircle2, Settings, Clapperboard, List } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const navItems = [
  { path: '/watchlist', icon: List, labelKey: 'watchlist' as const },
  { path: '/watched', icon: CheckCircle2, labelKey: 'watched' as const },
  { path: '/', icon: Clapperboard, labelKey: 'home' as const },
  { path: '/search', icon: Search, labelKey: 'search' as const },
  { path: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { t } = useI18n();

  useEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navigationType]);

  const { pathname } = location;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar - desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 glass">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl text-foreground group hidden">
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
        {children}
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
