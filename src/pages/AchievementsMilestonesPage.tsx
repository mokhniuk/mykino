import { Link } from 'react-router-dom';
import { ChevronLeft, Medal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import type { MilestoneId } from '@/lib/achievements';

type MilestoneKey = `milestone_${MilestoneId}`;
type MilestoneDescKey = `milestone_${MilestoneId}_desc`;

export default function AchievementsMilestonesPage() {
  const { t } = useI18n();
  const { milestones, isLoading } = useAchievements();

  return (
    <div className="px-4 md:px-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={28} />
        </Link>
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
            return (
              <div
                key={milestone.id}
                className={`rounded-xl p-4 flex flex-col gap-2 border transition-colors ${
                  milestone.unlocked
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-secondary border-border opacity-40'
                }`}
              >
                <span className="text-3xl leading-none">{milestone.icon}</span>
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
