import { Link, useLocation } from 'react-router-dom';
import { Home, Search, BookmarkPlus, Heart, Settings } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' as const },
  { path: '/search', icon: Search, labelKey: 'search' as const },
  { path: '/watchlist', icon: BookmarkPlus, labelKey: 'watchlist' as const },
  { path: '/favourites', icon: Heart, labelKey: 'favourites' as const },
  { path: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar - desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 glass">
        <Link to="/" className="font-display text-xl text-foreground">
          Kinofilm
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
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
      <main className="md:pt-16 pb-20 md:pb-8">
        {children}
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
