import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers, Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCollectionsByType, COLLECTIONS, FREE_COLLECTIONS_LIMIT } from '@/lib/api';
import CollectionCard from '@/components/CollectionCard';
import type { CollectionType } from '@/lib/api';
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
  const { user } = useAuth();
  const { isPro } = useProfile();
  const byType = getCollectionsByType();
  const isSignedOut = config.hasSync && !user;
  const isProLocked = config.hasSync && !!user && !isPro;

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

      {isSignedOut ? (
        /* ── Not signed in → sign-in wall ── */
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock size={24} className="text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">{t('collectionsSignInTitle')}</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{t('collectionsSignInDesc')}</p>
          <button
            onClick={() => navigate('/app/settings')}
            className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('collectionsSignInCta')}
          </button>
        </div>
      ) : (
        /* ── Signed in: flat list of all collections, locked ones show upgrade overlay ── */
        (() => {
          const freeSet = new Set(COLLECTIONS.slice(0, FREE_COLLECTIONS_LIMIT).map(c => c.slug));
          return (
            <div className="space-y-8">
              {TYPE_ORDER.map(type => {
                const cols = byType[type];
                if (!cols?.length) return null;
                return (
                  <div key={type}>
                    <h2 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                      {TYPE_LABELS[type]}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {cols.map(col => {
                        const locked = isProLocked && !freeSet.has(col.slug);
                        return locked ? (
                          <button
                            key={col.slug}
                            onClick={() => navigate('/app/settings')}
                            className="block rounded-xl overflow-hidden glass-card hover:opacity-90 transition-opacity text-left relative"
                          >
                            <div className="h-24 bg-secondary/50 flex items-center justify-center">
                              <Lock size={20} className="text-primary/60" />
                            </div>
                            <div className="px-3 py-2.5">
                              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider leading-none">Pro</span>
                              <p className="text-xs font-semibold text-foreground leading-snug mt-1 line-clamp-2">{col.title}</p>
                            </div>
                          </button>
                        ) : (
                          <CollectionCard key={col.slug} collection={col} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {isProLocked && (
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
          );
        })()
      )}
    </div>
  );
}
