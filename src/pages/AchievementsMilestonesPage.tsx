import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Medal, Clapperboard, Film, Star, Trophy, Clock, Globe, Languages, Layers, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import type { MilestoneId } from '@/lib/achievements';

type MilestoneKey = `milestone_${MilestoneId}`;
type MilestoneDescKey = `milestone_${MilestoneId}_desc`;

const MILESTONE_ICONS: Record<MilestoneId, LucideIcon> = {
  first_film:    Clapperboard,
  ten_films:     Film,
  fifty_films:   Star,
  hundred_films: Trophy,
  classic:       Clock,
  world_explorer:Globe,
  polyglot:      Languages,
  genre_master:  Layers,
};

export default function AchievementsMilestonesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { milestones, isLoading } = useAchievements();

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      <div className="flex items-center gap-3 pt-6 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors glass-shine">
          <ChevronLeft size={16} />
        </button>
        <Medal size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">{t('allMilestones')}</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl bg-secondary h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {milestones.map(milestone => {
            const titleKey = `milestone_${milestone.id}` as MilestoneKey;
            const descKey = `milestone_${milestone.id}_desc` as MilestoneDescKey;
            const Icon = MILESTONE_ICONS[milestone.id as MilestoneId];
            return (
              <div
                key={milestone.id}
                className={`rounded-xl p-4 flex flex-col gap-2 border transition-colors glass-shine ${
                  milestone.unlocked
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-secondary border-border opacity-40'
                }`}
              >
                <Icon
                  size={28}
                  className={milestone.unlocked ? 'text-primary' : 'text-muted-foreground'}
                />
                <p className="font-semibold text-sm text-foreground leading-snug">
                  {t(titleKey)}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {milestone.unlocked ? t(descKey) : '?'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
