import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCollectionsByType } from '@/lib/api';
import CollectionCard from '@/components/CollectionCard';
import type { CollectionType } from '@/lib/api';

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
  const byType = getCollectionsByType();

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
          return (
            <div key={type}>
              <h2 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                {TYPE_LABELS[type]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cols.map(col => (
                  <CollectionCard key={col.slug} collection={col} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
