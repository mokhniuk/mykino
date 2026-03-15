import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers, Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCollectionsByType, getFreeEditorialSlugs } from '@/lib/api';
import CollectionCard from '@/components/CollectionCard';
import type { CollectionType, Collection } from '@/lib/api';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

const TYPE_LABELS: Record<CollectionType, string> = {
  franchise: 'Franchises',
  studio: 'Studios',
  director: 'Directors',
  actor: 'Actors',
  genre: 'Genres',
  tv: 'TV Shows',
  decade: 'Decades',
  mood: 'Moods',
  awards: 'Awards',
  theme: 'Themes',
  classics: 'Classics',
};

const TYPE_ORDER: CollectionType[] = [
  'franchise', 'studio', 'director', 'actor', 'genre',
  'tv', 'decade', 'mood', 'awards', 'theme', 'classics',
];

export default function CollectionsBrowsePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: profileLoading } = useProfile();
  const byType = getCollectionsByType();
  const freeEditorialSlugs = getFreeEditorialSlugs();

  // Wait for both auth and profile to settle before applying access rules.
  // While loading, treat as logged-out (tmdb only) to avoid content flashing in then getting locked.
  const ready = !authLoading && (!user || !profileLoading);
  const effectiveUser = ready ? user : null;
  const effectiveIsPro = ready ? isPro : false;

  /** Editorial collections are hidden for community users and non-auth managed users. */
  const isHidden = (col: Collection): boolean =>
    col.source === 'editorial' && (!config.hasSync || !effectiveUser);

  /** Returns the lock state for a visible collection (only called when !isHidden). */
  const getLock = (col: Collection): 'open' | 'pro' => {
    if (!config.hasSync || col.source === 'tmdb') return 'open';
    if (effectiveIsPro || freeEditorialSlugs.has(col.slug)) return 'open';
    return 'pro';
  };

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      <div className="flex items-center gap-3 pt-6 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine"
        >
          <ChevronLeft size={16} />
        </button>
        <Layers size={22} className="text-primary shrink-0" />
        <h1 className="text-2xl font-semibold text-foreground">{t('editorialCollections')}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 pl-0.5">{t('editorialCollectionsDesc')}</p>

      <div className="space-y-8">
        {TYPE_ORDER.map(type => {
          const cols = byType[type];
          if (!cols?.length) return null;
          const visibleCols = cols.filter(col => !isHidden(col));
          if (!visibleCols.length) return null;
          return (
            <div key={type}>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                {TYPE_LABELS[type]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleCols.map(col => {
                  const lock = getLock(col);
                  if (lock === 'open') return <CollectionCard key={col.slug} collection={col} />;
                  return (
                    <button
                      key={col.slug}
                      onClick={() => navigate('/app/settings')}
                      className="block rounded-xl overflow-hidden glass-card hover:opacity-90 transition-opacity text-left"
                    >
                      <div className="h-24 bg-secondary/50 flex items-center justify-center">
                        <Lock size={20} className="text-primary/60" />
                      </div>
                      <div className="px-3 py-2.5">
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider leading-none">Pro</span>
                        <p className="text-xs font-semibold text-foreground leading-snug mt-1 line-clamp-2">{col.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Upgrade CTA if any collections are locked */}
        {TYPE_ORDER.some(type => byType[type]?.some(col => !isHidden(col) && getLock(col) !== 'open')) && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigate('/app/settings')}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t('collectionsProCta')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
