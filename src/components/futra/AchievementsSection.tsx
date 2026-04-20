import { useUserAchievements, useAllAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Award } from '@/lib/icons';

interface AchievementsSectionProps {
  userId: string | undefined;
  compact?: boolean;
}

export function AchievementsSection({ userId, compact = false }: AchievementsSectionProps) {
  const { data: unlocked } = useUserAchievements(userId);
  const { data: all } = useAllAchievements();

  if (!all || all.length === 0) return null;

  const unlockedIds = new Set((unlocked || []).map((a: any) => a.id));
  const unlockedMap = Object.fromEntries((unlocked || []).map((a: any) => [a.id, a.unlocked_at]));

  const sorted = [...all].sort((a, b) => {
    const aU = unlockedIds.has(a.id) ? 0 : 1;
    const bU = unlockedIds.has(b.id) ? 0 : 1;
    return aU - bU;
  });

  const items = compact ? sorted.filter(a => unlockedIds.has(a.id)).slice(0, 6) : sorted;

  if (compact && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Conquistas</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {unlocked?.length || 0}/{all.length} desbloqueadas
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((ach: any) => (
          <AchievementBadge
            key={ach.id}
            name={ach.name}
            description={ach.description}
            icon={ach.icon}
            rarity={ach.rarity}
            unlocked={unlockedIds.has(ach.id)}
            unlockedAt={unlockedMap[ach.id]}
            size={compact ? 'sm' : 'md'}
          />
        ))}
      </div>
    </div>
  );
}
