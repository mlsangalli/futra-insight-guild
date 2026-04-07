import { useState } from 'react';
import { Target, MessageCircle, Bookmark, Share2, Trophy, Layers, Clock, Check, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useMissions, useClaimMission, type MissionWithProgress } from '@/hooks/useMissions';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_ICONS: Record<string, React.ElementType> = {
  prediction: Target,
  comment: MessageCircle,
  watchlist: Bookmark,
  share: Share2,
  win: Trophy,
  category_diversity: Layers,
  pre_lock: Clock,
};

function MissionRow({ mission }: { mission: MissionWithProgress }) {
  const claim = useClaimMission();
  const Icon = ACTION_ICONS[mission.action_type] || Target;
  const pct = Math.min((mission.current_value / mission.goal_value) * 100, 100);
  const isClaimed = !!mission.claimed_at;
  const canClaim = mission.completed && !isClaimed && !!mission.user_mission_id;

  return (
    <div className={cn('flex items-center gap-3 py-3', isClaimed && 'opacity-50')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        mission.completed ? 'bg-emerald/10 text-emerald' : 'bg-muted text-muted-foreground'
      )}>
        {isClaimed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{mission.title}</p>
          <span className="text-xs text-muted-foreground shrink-0">
            {mission.current_value}/{mission.goal_value}
          </span>
        </div>
        <Progress value={pct} className="h-1.5 mt-1.5" />
      </div>

      <div className="shrink-0 ml-1">
        {canClaim ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2 border-emerald/30 text-emerald hover:bg-emerald/10"
            onClick={() => claim.mutate(mission.user_mission_id!)}
            disabled={claim.isPending}
          >
            <Gift className="h-3 w-3 mr-1" />
            Resgatar
          </Button>
        ) : (
          <span className={cn(
            'text-xs font-medium whitespace-nowrap',
            isClaimed ? 'text-muted-foreground' : 'text-primary'
          )}>
            {mission.reward_credits} FC
          </span>
        )}
      </div>
    </div>
  );
}

export function MissionsCard() {
  const { data: missions, isLoading } = useMissions();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-1.5 w-full" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!missions || missions.length === 0) return null;

  const filtered = missions.filter(m => m.period === tab);
  const completedCount = filtered.filter(m => m.completed).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-foreground">Missões</h3>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setTab('daily')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'daily' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Diárias
          </button>
          <button
            onClick={() => setTab('weekly')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'weekly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Semanais
          </button>
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          {completedCount}/{filtered.length} concluídas
        </p>
      )}

      <div className="divide-y divide-border">
        {filtered.map(m => (
          <MissionRow key={m.id} mission={m} />
        ))}
      </div>
    </div>
  );
}
