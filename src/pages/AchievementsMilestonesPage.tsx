import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Medal, Clapperboard, Film, Star, Trophy, Clock, Globe, Languages, Layers, Popcorn, Crown, Zap, Hourglass, Timer, Rewind, CalendarDays, Award, ListOrdered, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAchievements } from '@/hooks/useAchievements';
import type { MilestoneId } from '@/lib/achievements';

type MilestoneKey = `milestone_${MilestoneId}`;
type MilestoneDescKey = `milestone_${MilestoneId}_desc`;

const MILESTONE_ICONS: Record<MilestoneId, LucideIcon> = {
  first_film:       Clapperboard,
  ten_films:        Film,
  twenty_five_films:Popcorn,
  fifty_films:      Star,
  hundred_films:    Trophy,
  two_hundred_films:Crown,
  top_contender:    ListOrdered,
  classic:          Clock,
  time_traveller:   Rewind,
  world_explorer:   Globe,
  polyglot:         Languages,
  genre_master:     Layers,
  decade_hopper:    CalendarDays,
  director_devotee: Award,
  binge_day:        Zap,
  epic_viewer:      Hourglass,
  quick_pick:       Timer,
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
                className={`rounded-xl p-4 flex flex-col border transition-all glass-shine relative ${
                  milestone.unlocked
                    ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-[0_0_14px_hsl(var(--primary)/0.15)]'
                    : 'bg-secondary border-border opacity-50'
                }`}
              >
                {milestone.unlocked && (
                  <div className="absolute top-3 right-3">
                    <Star size={10} className="text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.7)]" fill="currentColor" />
                  </div>
                )}
                <Icon
                  size={26}
                  className={`mb-2 ${milestone.unlocked ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <p className="font-semibold text-sm text-foreground leading-snug mb-1">
                  {t(titleKey)}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {milestone.unlocked ? t(descKey) : '?'}
                </p>
                {!milestone.unlocked && milestone.target && milestone.progress !== undefined && milestone.progress > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{ width: `${(milestone.progress / milestone.target) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      {milestone.progress} / {milestone.target}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
