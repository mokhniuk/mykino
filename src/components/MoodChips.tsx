import { useMemo } from 'react';
import { Smile, Ghost, Heart, Brain, Zap, Coffee, Film, Search, Lightbulb, Droplets, Laugh, AlertTriangle, Drama, Rocket, Wand2, Fingerprint, Users, Star, Clock, Gem } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface MoodChipsProps {
  onSelect: (mood: string) => void;
}

export default function MoodChips({ onSelect }: MoodChipsProps) {
  const { t } = useI18n();

  const chips = useMemo(() => [
    { icon: Smile,       key: 'moodFun' },
    { icon: Ghost,       key: 'moodScary' },
    { icon: Heart,       key: 'moodRomantic' },
    { icon: Brain,       key: 'moodThinking' },
    { icon: Zap,         key: 'moodAction' },
    { icon: Coffee,      key: 'moodChill' },
    { icon: Film,        key: 'moodEpic' },
    { icon: Search,      key: 'moodMystery' },
    { icon: Lightbulb,   key: 'moodInspiring' },
    { icon: Droplets,    key: 'moodEmotional' },
    { icon: Laugh,       key: 'moodComedy' },
    { icon: AlertTriangle, key: 'moodThriller' },
    { icon: Drama,       key: 'moodDrama' },
    { icon: Rocket,      key: 'moodSci' },
    { icon: Wand2,       key: 'moodFantasy' },
    { icon: Fingerprint, key: 'moodCrime' },
    { icon: Users,       key: 'moodFamily' },
    { icon: Star,        key: 'moodClassic' },
    { icon: Clock,       key: 'moodRecent' },
    { icon: Gem,         key: 'moodUnderrated' },
  // Shuffle once on mount so each render has a different order
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []).map((chip, i) => ({
    ...chip,
    // Random delay spread: first chip appears fast (~30ms), last up to ~600ms
    delay: 30 + Math.random() * 570,
    // Tiny random rotation adds liveliness without chaos
    rotate: (Math.random() - 0.5) * 6,
    order: i,
  })).sort(() => Math.random() - 0.5); // shuffle display order

  return (
    <div className="flex flex-wrap justify-center gap-2 py-2">
      {chips.map(({ icon: Icon, key, delay, rotate }) => (
        <button
          key={key}
          onClick={() => onSelect(t(key as any))}
          style={{
            animation: `chip-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms both`,
            '--rotate': `${rotate}deg`,
          } as React.CSSProperties}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-secondary hover:bg-secondary/70 text-foreground
                     transition-colors hover:scale-105 active:scale-95"
        >
          <Icon size={14} />
          {t(key as any)}
        </button>
      ))}
    </div>
  );
}
