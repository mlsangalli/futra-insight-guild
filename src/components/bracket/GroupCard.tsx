import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from '@/lib/icons';
import type { TournamentGroup, GroupTeam } from '@/types/bracket';

interface GroupCardProps {
  group: TournamentGroup;
  orderedTeams: GroupTeam[];
  onReorder: (teamIds: string[]) => void;
  disabled?: boolean;
  isConfirmed?: boolean;
}

export function GroupCard({ group, orderedTeams, onReorder, disabled, isConfirmed }: GroupCardProps) {
  const teams = orderedTeams.length === 4 ? orderedTeams : group.teams;

  const moveTeam = useCallback((fromIdx: number, toIdx: number) => {
    if (disabled) return;
    const newOrder = [...teams];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorder(newOrder.map(t => t.id));
  }, [teams, onReorder, disabled]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-secondary/50 border-b border-border">
        <h3 className="text-sm font-bold tracking-wide">
          Grupo <span className="text-primary">{group.group_letter}</span>
        </h3>
      </div>
      <div className="divide-y divide-border">
        {teams.map((team, idx) => (
          <div
            key={team.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors',
              idx < 2 && 'bg-accent/5',
              idx === 2 && 'bg-warning/5',
              idx === 3 && 'bg-secondary/30 opacity-60',
            )}
          >
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              idx === 0 && 'bg-primary/20 text-primary',
              idx === 1 && 'bg-accent/20 text-accent',
              idx === 2 && 'bg-warning/20 text-warning',
              idx === 3 && 'bg-muted text-muted-foreground',
            )}>
              {idx + 1}
            </span>
            <span className="text-lg">{team.flag_emoji}</span>
            <span className="text-sm font-medium flex-1 truncate">{team.team_name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{team.team_code}</span>
            {!disabled && (
              <div className="flex flex-col gap-0.5">
                {idx > 0 && (
                  <button
                    onClick={() => moveTeam(idx, idx - 1)}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    aria-label="Mover para cima"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3L10 8H2L6 3Z" fill="currentColor"/></svg>
                  </button>
                )}
                {idx < 3 && (
                  <button
                    onClick={() => moveTeam(idx, idx + 1)}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    aria-label="Mover para baixo"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9L2 4H10L6 9Z" fill="currentColor"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-2 bg-secondary/20 flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/50" /> Classificado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning/50" /> Possível 3º</span>
        </div>
        {isConfirmed ? (
          <span className="text-[10px] font-medium text-accent flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Confirmado
          </span>
        ) : !disabled ? (
          <button
            onClick={() => onReorder(teams.map(t => t.id))}
            className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Confirmar ✓
          </button>
        ) : null}
      </div>
    </div>
  );
}
