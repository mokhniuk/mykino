import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, Layers, Clapperboard, TrendingUp, Flame, Gem, RefreshCw, ChevronLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useRecommendations } from '@/hooks/useRecommendations';
import { SLUG_TO_SECTION_ID, type RecoSection } from '@/lib/recommendations';
import MovieCard from '@/components/MovieCard';

const SECTION_ICONS: Record<RecoSection['id'], React.ReactNode> = {
  becauseLiked: <ThumbsUp size={24} className="text-primary" />,
  byGenre:      <Layers size={24} className="text-primary" />,
  nowPlaying:   <Clapperboard size={24} className="text-primary" />,
  trending:     <TrendingUp size={24} className="text-primary" />,
  popular:      <Flame size={24} className="text-primary" />,
  hiddenGems:   <Gem size={24} className="text-primary" />,
};

type SectionTitleKey = 'sectionBecauseLiked' | 'sectionByGenre' | 'sectionNowPlaying' | 'sectionTrending' | 'sectionPopular' | 'sectionHiddenGems';

const SECTION_TITLE_KEYS: Record<RecoSection['id'], SectionTitleKey> = {
  becauseLiked: 'sectionBecauseLiked',
  byGenre:      'sectionByGenre',
  nowPlaying:   'sectionNowPlaying',
  trending:     'sectionTrending',
  popular:      'sectionPopular',
  hiddenGems:   'sectionHiddenGems',
};

export default function RecoSectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { sections, isLoading, isFetching, refresh } = useRecommendations();

  const sectionId = slug ? SLUG_TO_SECTION_ID[slug] : undefined;
  const section = sectionId ? sections.find(s => s.id === sectionId) : undefined;

  const title = sectionId
    ? section?.id === 'becauseLiked' && section.seedTitle
      ? `${t(SECTION_TITLE_KEYS[sectionId])} ${section.seedTitle}`
      : t(SECTION_TITLE_KEYS[sectionId] ?? 'forYou')
    : '';

  let subtitle: string | null = null;
  if (sectionId === 'hiddenGems') subtitle = t('sectionHiddenGemsDesc');
  else if (sectionId === 'byGenre') subtitle = t('sectionByGenreDesc');

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pt-6 md:pt-10 mb-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={24} />
          </Link>
          {sectionId && SECTION_ICONS[sectionId]}
          <h1 className="text-2xl md:text-3xl text-foreground">{title}</h1>
        </div>
        <button
          onClick={refresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
        >
          <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {subtitle && <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>}

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 mt-6">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] rounded-xl bg-secondary animate-pulse" />
              <div className="h-2.5 bg-secondary rounded animate-pulse" />
              <div className="h-2.5 w-2/3 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : section && section.movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 mt-6">
          {section.movies.slice(0, 100).map(movie => (
            <MovieCard key={movie.imdbID} movie={movie} fluid />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            {sectionId ? SECTION_ICONS[sectionId] : <Flame size={28} className="text-muted-foreground/40" />}
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">{t('emptyForYouHint')}</p>
        </div>
      )}
    </div>
  );
}
